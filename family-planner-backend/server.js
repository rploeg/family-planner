const path = require('path');
const fs = require('fs');

// Load .env from persisted volume if in container, otherwise from app root
const envPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, 'data', '.env')
  : path.join(__dirname, '.env');

console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[Startup] Loading .env from: ${envPath}`);
console.log(`[Startup] File exists: ${fs.existsSync(envPath)}`);

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log(`[Startup] .env file size: ${content.length} bytes`);
  console.log(`[Startup] .env first 500 chars:\n${content.substring(0, 500)}`);
}

require('dotenv').config({ path: envPath });

console.log(`[Startup] LOXONE_SERVER_URL: ${process.env.LOXONE_SERVER_URL || 'not set'}`);
console.log(`[Startup] LOXONE_USERNAME: ${process.env.LOXONE_USERNAME || 'not set'}`);
console.log(`[Startup] LOXONE_PASSWORD: ${process.env.LOXONE_PASSWORD ? '(set)' : 'not set'}`);
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const DatabaseManager = require('./database/DatabaseManager');
const CalDAVService = require('./services/CalDAVService');
const GoogleTasksService = require('./services/GoogleTasksService');
const GoogleCalendarService = require('./services/GoogleCalendarService');
const LoxoneService = require('./services/LoxoneService');
const RecipeService = require('./services/RecipeService');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Database - use absolute path to prevent issues when running from different directories
const dbPath = process.env.DATABASE_PATH?.startsWith('/') 
  ? process.env.DATABASE_PATH 
  : path.join(__dirname, process.env.DATABASE_PATH || './data/family-planner.db');
const db = new DatabaseManager(dbPath);

// Initialize CalDAV Service
const calDAVService = new CalDAVService({
  serverUrl: process.env.CALDAV_SERVER_URL,
  username: process.env.CALDAV_USERNAME,
  password: process.env.CALDAV_PASSWORD
});

// Initialize Google Tasks Service
const googleTasksService = new GoogleTasksService({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/google/callback`,
  taskListName: process.env.GOOGLE_TASKS_LIST_NAME || 'Shopping List'
});

// Initialize Google Calendar Service
const googleCalendarService = new GoogleCalendarService({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/google/callback`,
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary'
});

// Calendar source setting: 'apple', 'google', 'both'
const CALENDAR_SOURCE = process.env.CALENDAR_SOURCE || 'apple';
const GOOGLE_CALENDAR_ENABLED = process.env.GOOGLE_CALENDAR_ENABLED === 'true';

// Initialize Loxone Service (optional)
const loxoneService = new LoxoneService({
  serverUrl: process.env.LOXONE_SERVER_URL,
  username: process.env.LOXONE_USERNAME,
  password: process.env.LOXONE_PASSWORD
});

// Initialize Recipe Service
const recipeService = new RecipeService();

// Version/Build info for deployment verification
let APP_VERSION = '1.0.0';
let BUILD_COMMIT = process.env.BUILD_COMMIT || 'unknown';
let BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString();
try {
  const packageJson = require('./package.json');
  APP_VERSION = packageJson.version;
} catch (e) {
  // Fallback if package.json not readable
}

// Google Tasks Sync Configuration
const GOOGLE_SYNC_INTERVAL = parseInt(process.env.GOOGLE_SYNC_INTERVAL) || 60; // seconds
let googleSyncTimer = null;

// Helper function to sync a single item to Google Tasks
async function syncItemToGoogle(item, action = 'upsert') {
  if (!googleTasksService.isInitialized) return null;
  
  // Determine list type based on the item's listId
  const listType = await getListType(item.listId);
  
  try {
    if (action === 'create' || (action === 'upsert' && !item.googleTaskId)) {
      const googleId = await googleTasksService.createTask({
        name: item.text,
        notes: item.category || '',
        completed: item.checked === 1,
        dueDate: item.dueDate
      }, listType);
      // Update the database with the Google Task ID
      await db.run(
        'UPDATE shopping_list_items SET googleTaskId = ? WHERE id = ?',
        [googleId, item.id]
      );
      console.log(`  ↑ Synced to Google Tasks (${listType}): ${item.text}`);
      return googleId;
    } else if (action === 'update' && item.googleTaskId) {
      await googleTasksService.updateTask(item.googleTaskId, {
        title: item.text,
        notes: item.category || '',
        completed: item.checked === 1,
        dueDate: item.dueDate
      }, listType);
      console.log(`  ↔ Updated in Google Tasks (${listType}): ${item.text}`);
      return item.googleTaskId;
    } else if (action === 'delete' && item.googleTaskId) {
      await googleTasksService.deleteTask(item.googleTaskId, listType);
      console.log(`  ↓ Deleted from Google Tasks (${listType}): ${item.text}`);
      return null;
    }
  } catch (error) {
    console.error(`  ✗ Google sync failed for ${item.text}:`, error.message);
  }
  return null;
}

// Helper to get list type from listId
async function getListType(listId) {
  try {
    const list = await db.get('SELECT type FROM shopping_lists WHERE id = ?', [listId]);
    return list?.type || 'grocery';
  } catch {
    return 'grocery';
  }
}

// Bidirectional sync function - syncs both grocery and task lists
// Helper to normalize date to YYYY-MM-DD format
function normalizeDateToYYYYMMDD(dateValue) {
  if (!dateValue) return null;
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  // Parse ISO date and convert to YYYY-MM-DD
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

async function performBidirectionalSync() {
  if (!googleTasksService.isInitialized) return;
  
  try {
    // Sync grocery list (list1 → Shopping List)
    await syncListWithGoogle('list1', 'grocery');
    
    // Sync task list (Taken → default Google Tasks)
    const taskList = await db.get("SELECT id FROM shopping_lists WHERE type = 'tasks' LIMIT 1");
    if (taskList) {
      await syncListWithGoogle(taskList.id, 'tasks');
    }
    
  } catch (error) {
    console.error('Bidirectional sync error:', error.message);
  }
}

// Sync a specific list with Google Tasks
async function syncListWithGoogle(localListId, listType) {
  try {
    // Get items from database for this specific list
    const dbItems = await db.all('SELECT * FROM shopping_list_items WHERE listId = ?', [localListId]);
    
    // Get all tasks from Google for this list type
    const googleTasks = await googleTasksService.getTasks(listType);
    
    // Create lookup maps
    const dbByGoogleId = new Map(dbItems.filter(i => i.googleTaskId).map(i => [i.googleTaskId, i]));
    const googleById = new Map(googleTasks.map(t => [t.id, t]));
    
    let created = 0, updated = 0, pulledNew = 0, pulledUpdates = 0, deleted = 0;
    
    // Sync local items to Google (items without googleTaskId)
    for (const item of dbItems) {
      if (!item.googleTaskId) {
        const googleId = await googleTasksService.createTask({
          name: item.text,
          notes: item.category || '',
          completed: item.checked === 1,
          dueDate: item.dueDate
        }, listType);
        await db.run('UPDATE shopping_list_items SET googleTaskId = ? WHERE id = ?', [googleId, item.id]);
        console.log(`  ↑ Synced to Google (${listType}): ${item.text}`);
        created++;
      }
    }
    
    // Pull new/updated items from Google
    for (const googleTask of googleTasks) {
      const dbItem = dbByGoogleId.get(googleTask.id);
      
      if (!dbItem) {
        // New task from Google - create in database
        const now = new Date().toISOString();
        const newId = `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const normalizedDueDate = normalizeDateToYYYYMMDD(googleTask.dueDate);
        await db.run(
          `INSERT INTO shopping_list_items (id, listId, text, checked, addedBy, category, createdAt, updatedAt, googleTaskId, dueDate)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId, localListId, googleTask.title, googleTask.completed ? 1 : 0, 'Google', googleTask.notes || 'household', now, now, googleTask.id, normalizedDueDate]
        );
        console.log(`  ↓ Pulled from Google (${listType}): ${googleTask.title}`);
        pulledNew++;
      } else {
        // Check if Google version is newer and different
        const googleUpdated = new Date(googleTask.updatedAt);
        const dbUpdated = new Date(dbItem.updatedAt);
        
        if (googleUpdated > dbUpdated) {
          // Google is newer - update local
          const googleChecked = googleTask.completed ? 1 : 0;
          const normalizedDueDate = normalizeDateToYYYYMMDD(googleTask.dueDate);
          if (dbItem.text !== googleTask.title || dbItem.checked !== googleChecked || dbItem.dueDate !== normalizedDueDate) {
            await db.run(
              `UPDATE shopping_list_items SET text = ?, checked = ?, updatedAt = ?, dueDate = ? WHERE id = ?`,
              [googleTask.title, googleChecked, googleTask.updatedAt, normalizedDueDate, dbItem.id]
            );
            console.log(`  ↓ Updated from Google (${listType}): ${googleTask.title}`);
            pulledUpdates++;
          }
        } else if (dbUpdated > googleUpdated) {
          // Local is newer - update Google
          await googleTasksService.updateTask(dbItem.googleTaskId, {
            title: dbItem.text,
            completed: dbItem.checked === 1,
            dueDate: dbItem.dueDate
          }, listType);
          updated++;
        }
      }
    }
    
    // Check for items deleted from Google
    for (const item of dbItems) {
      if (item.googleTaskId && !googleById.has(item.googleTaskId)) {
        // Task was deleted from Google - delete locally too
        await db.run('DELETE FROM shopping_list_items WHERE id = ?', [item.id]);
        console.log(`  ↓ Deleted (removed from Google ${listType}): ${item.text}`);
        deleted++;
      }
    }
    
    if (created + updated + pulledNew + pulledUpdates + deleted > 0) {
      console.log(`✓ Sync ${listType}: ↑${created} created, ↔${updated} updated, ↓${pulledNew} new, ↓${pulledUpdates} updates, ✗${deleted} deleted`);
    }
    
  } catch (error) {
    console.error(`Sync error for ${listType}:`, error.message);
  }
}

// Start periodic Google Tasks sync
function startGoogleSyncTimer() {
  if (googleSyncTimer) clearInterval(googleSyncTimer);
  
  googleSyncTimer = setInterval(async () => {
    if (googleTasksService.isInitialized) {
      await performBidirectionalSync();
    }
  }, GOOGLE_SYNC_INTERVAL * 1000);
  
  console.log(`  ⏱ Google Tasks sync interval: ${GOOGLE_SYNC_INTERVAL} seconds`);
}

// Middleware
const corsOrigin = process.env.CORS_ORIGIN === '*' 
  ? '*' 
  : process.env.CORS_ORIGIN?.split(',') || '*';

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(bodyParser.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: APP_VERSION,
    build: BUILD_COMMIT,
    buildDate: BUILD_DATE,
    database: 'connected',
    caldav: calDAVService.isInitialized ? 'connected' : 'disconnected',
    googleCalendar: googleCalendarService.isInitialized ? 'connected' : 'disconnected',
    loxone: loxoneService.isInitialized ? 'connected' : 'disconnected',
    googleTasks: googleTasksService.isInitialized ? 'connected' : 'disconnected',
    calendarSource: CALENDAR_SOURCE
  });
});

// Status endpoint (alias for health check)
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok',
    version: APP_VERSION,
    build: BUILD_COMMIT,
    buildDate: BUILD_DATE,
    database: 'connected',
    caldav: calDAVService.isInitialized ? 'connected' : 'disconnected',
    googleCalendar: googleCalendarService.isInitialized ? 'connected' : 'disconnected',
    loxone: loxoneService.isInitialized ? 'connected' : 'disconnected',
    googleTasks: googleTasksService.isInitialized ? 'connected' : 'disconnected',
    calendarSource: CALENDAR_SOURCE
  });
});

// ============================================
// WEATHER API ENDPOINTS
// Uses Open-Meteo API (free, no key required)
// ============================================

// Default location: Zeist, Netherlands
const WEATHER_DEFAULT_LAT = 52.0907;
const WEATHER_DEFAULT_LON = 5.2334;
const WEATHER_API_BASE = 'https://api.open-meteo.com/v1';

// WMO Weather codes to condition text
const weatherConditions = {
  0: { nl: 'Helder', en: 'Clear', icon: '☀️' },
  1: { nl: 'Overwegend helder', en: 'Mainly clear', icon: '🌤️' },
  2: { nl: 'Gedeeltelijk bewolkt', en: 'Partly cloudy', icon: '⛅' },
  3: { nl: 'Bewolkt', en: 'Overcast', icon: '☁️' },
  45: { nl: 'Mist', en: 'Foggy', icon: '🌫️' },
  48: { nl: 'IJsmist', en: 'Rime fog', icon: '🌫️' },
  51: { nl: 'Lichte motregen', en: 'Light drizzle', icon: '🌧️' },
  53: { nl: 'Motregen', en: 'Moderate drizzle', icon: '🌧️' },
  55: { nl: 'Dichte motregen', en: 'Dense drizzle', icon: '🌧️' },
  61: { nl: 'Lichte regen', en: 'Slight rain', icon: '🌧️' },
  63: { nl: 'Regen', en: 'Moderate rain', icon: '🌧️' },
  65: { nl: 'Zware regen', en: 'Heavy rain', icon: '🌧️' },
  71: { nl: 'Lichte sneeuw', en: 'Slight snow', icon: '🌨️' },
  73: { nl: 'Sneeuw', en: 'Moderate snow', icon: '🌨️' },
  75: { nl: 'Zware sneeuw', en: 'Heavy snow', icon: '❄️' },
  77: { nl: 'Sneeuwkorrels', en: 'Snow grains', icon: '🌨️' },
  80: { nl: 'Lichte buien', en: 'Slight showers', icon: '🌦️' },
  81: { nl: 'Buien', en: 'Moderate showers', icon: '🌦️' },
  82: { nl: 'Zware buien', en: 'Violent showers', icon: '⛈️' },
  85: { nl: 'Lichte sneeuwbuien', en: 'Slight snow showers', icon: '🌨️' },
  86: { nl: 'Zware sneeuwbuien', en: 'Heavy snow showers', icon: '🌨️' },
  95: { nl: 'Onweer', en: 'Thunderstorm', icon: '⛈️' },
  96: { nl: 'Onweer met hagel', en: 'Thunderstorm with hail', icon: '⛈️' },
  99: { nl: 'Onweer met zware hagel', en: 'Thunderstorm with heavy hail', icon: '⛈️' }
};

function getWeatherCondition(code) {
  return weatherConditions[code] || { nl: 'Onbekend', en: 'Unknown', icon: '❓' };
}

// Get current weather and forecast
app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || WEATHER_DEFAULT_LAT;
    const lon = parseFloat(req.query.lon) || WEATHER_DEFAULT_LON;
    const lang = req.query.lang || 'nl';

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset',
      timezone: 'Europe/Amsterdam',
      forecast_days: 7
    });

    const response = await fetch(`${WEATHER_API_BASE}/forecast?${params}`);
    if (!response.ok) throw new Error('Failed to fetch weather data');
    
    const data = await response.json();
    const condition = getWeatherCondition(data.current.weather_code);

    const result = {
      location: {
        lat,
        lon,
        name: lat === WEATHER_DEFAULT_LAT && lon === WEATHER_DEFAULT_LON ? 'Zeist' : 'Custom'
      },
      current: {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        windDirection: data.current.wind_direction_10m,
        precipitation: data.current.precipitation,
        weatherCode: data.current.weather_code,
        condition: condition[lang] || condition.en,
        icon: condition.icon
      },
      hourly: data.hourly.time.slice(0, 24).map((time, index) => {
        const cond = getWeatherCondition(data.hourly.weather_code[index]);
        return {
          time,
          temperature: Math.round(data.hourly.temperature_2m[index]),
          precipitationProbability: data.hourly.precipitation_probability[index],
          precipitation: data.hourly.precipitation[index],
          condition: cond[lang] || cond.en,
          icon: cond.icon
        };
      }),
      daily: data.daily.time.map((date, index) => {
        const cond = getWeatherCondition(data.daily.weather_code[index]);
        return {
          date,
          maxTemp: Math.round(data.daily.temperature_2m_max[index]),
          minTemp: Math.round(data.daily.temperature_2m_min[index]),
          precipitationSum: data.daily.precipitation_sum[index],
          precipitationProbability: data.daily.precipitation_probability_max[index],
          sunrise: data.daily.sunrise[index],
          sunset: data.daily.sunset[index],
          condition: cond[lang] || cond.en,
          icon: cond.icon
        };
      }),
      fetchedAt: new Date().toISOString()
    };

    res.json(result);
  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data', details: error.message });
  }
});

// Get current configuration (all settings)
app.get('/api/config', (req, res) => {
  res.json({
    server: {
      port: process.env.PORT || '3002',
      nodeEnv: process.env.NODE_ENV || 'development',
      databasePath: process.env.DATABASE_PATH || './data/family-planner.db',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    calendarSource: process.env.CALENDAR_SOURCE || 'apple',
    caldav: {
      enabled: !!process.env.CALDAV_SERVER_URL,
      serverUrl: process.env.CALDAV_SERVER_URL || '',
      username: process.env.CALDAV_USERNAME || '',
      password: process.env.CALDAV_PASSWORD ? '********' : '',
      hasPassword: !!process.env.CALDAV_PASSWORD,
      connected: calDAVService.isInitialized,
      calendarsCount: calDAVService.calendars?.length || 0,
      syncInterval: parseInt(process.env.CALENDAR_SYNC_INTERVAL) || 5
    },
    googleTasks: {
      enabled: !!process.env.GOOGLE_CLIENT_ID,
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '********' : '',
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/google/callback`,
      taskListName: process.env.GOOGLE_TASKS_LIST_NAME || 'Shopping List',
      syncInterval: parseInt(process.env.GOOGLE_SYNC_INTERVAL) || 30,
      connected: googleTasksService.isInitialized
    },
    googleCalendar: {
      enabled: process.env.GOOGLE_CALENDAR_ENABLED === 'true',
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      connected: googleCalendarService.isInitialized
    },
    loxone: {
      enabled: !!process.env.LOXONE_SERVER_URL,
      serverUrl: process.env.LOXONE_SERVER_URL || '',
      username: process.env.LOXONE_USERNAME || '',
      password: process.env.LOXONE_PASSWORD ? '********' : '',
      hasPassword: !!process.env.LOXONE_PASSWORD,
      connected: loxoneService.isInitialized
    }
  });
});

// Save configuration to .env file
app.post('/api/config', async (req, res) => {
  try {
    const config = req.body;
    console.log('📝 /api/config POST received');
    
    // Use persisted volume path in production (Docker), otherwise use app root
    const configEnvPath = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, 'data', '.env')
      : path.join(__dirname, '.env');
    
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   Saving to: ${configEnvPath}`);
    
    // Ensure data directory exists
    const dataDir = path.dirname(configEnvPath);
    if (!fs.existsSync(dataDir)) {
      console.log(`   Creating directory: ${dataDir}`);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Read current .env file to preserve passwords if not changed
    let currentEnv = {};
    if (fs.existsSync(configEnvPath)) {
      const content = fs.readFileSync(configEnvPath, 'utf8');
      content.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key) currentEnv[key.trim()] = valueParts.join('=').trim();
        }
      });
    }
    
    // Build new .env content
    const envContent = `# Family Planner Backend Environment Configuration

# Server Configuration
PORT=${config.server?.port || currentEnv.PORT || '3002'}
NODE_ENV=${config.server?.nodeEnv || currentEnv.NODE_ENV || 'development'}

# Database
DATABASE_PATH=${config.server?.databasePath || currentEnv.DATABASE_PATH || './data/family-planner.db'}

# iCloud Calendar (CalDAV) - For calendar sync only
CALDAV_SERVER_URL=${config.caldav?.serverUrl || currentEnv.CALDAV_SERVER_URL || ''}
CALDAV_USERNAME=${config.caldav?.username || currentEnv.CALDAV_USERNAME || ''}
CALDAV_PASSWORD=${config.caldav?.password === '********' ? currentEnv.CALDAV_PASSWORD : (config.caldav?.password || '')}

# CORS - Allow frontend access
CORS_ORIGIN=${config.server?.corsOrigin || currentEnv.CORS_ORIGIN || 'http://localhost:3000'}

# Calendar Sync Interval (minutes)
CALENDAR_SYNC_INTERVAL=${config.caldav?.syncInterval || currentEnv.CALENDAR_SYNC_INTERVAL || '5'}

# Calendar Source - Options: apple, google, both
CALENDAR_SOURCE=${config.calendarSource || currentEnv.CALENDAR_SOURCE || 'apple'}

# Google Tasks Integration - For shopping list sync
# Create credentials at: https://console.cloud.google.com/apis/credentials
# Enable Google Tasks API at: https://console.cloud.google.com/apis/library/tasks.googleapis.com
GOOGLE_CLIENT_ID=${config.googleTasks?.clientId || currentEnv.GOOGLE_CLIENT_ID || ''}
GOOGLE_CLIENT_SECRET=${config.googleTasks?.clientSecret === '********' ? currentEnv.GOOGLE_CLIENT_SECRET : (config.googleTasks?.clientSecret || '')}
GOOGLE_REDIRECT_URI=${config.googleTasks?.redirectUri || currentEnv.GOOGLE_REDIRECT_URI || 'http://localhost:3002/api/google/callback'}
GOOGLE_TASKS_LIST_NAME=${config.googleTasks?.taskListName || currentEnv.GOOGLE_TASKS_LIST_NAME || 'Shopping List'}
GOOGLE_SYNC_INTERVAL=${config.googleTasks?.syncInterval || currentEnv.GOOGLE_SYNC_INTERVAL || '30'}

# Google Calendar Integration - For calendar events sync
# Uses the same Google OAuth credentials as Google Tasks
# Enable Google Calendar API at: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
GOOGLE_CALENDAR_ENABLED=${config.googleCalendar?.enabled === true || config.googleCalendar?.enabled === 'true' ? 'true' : (currentEnv.GOOGLE_CALENDAR_ENABLED || 'false')}
GOOGLE_CALENDAR_ID=${config.googleCalendar?.calendarId || currentEnv.GOOGLE_CALENDAR_ID || 'primary'}

# Loxone Integration - Optional, comment out if not using
LOXONE_SERVER_URL=${config.loxone?.serverUrl || currentEnv.LOXONE_SERVER_URL || ''}
LOXONE_USERNAME=${config.loxone?.username || currentEnv.LOXONE_USERNAME || ''}
LOXONE_PASSWORD=${config.loxone?.password === '********' ? currentEnv.LOXONE_PASSWORD : (config.loxone?.password || '')}
`;

    fs.writeFileSync(configEnvPath, envContent);
    console.log(`✓ Config saved to ${configEnvPath}`);
    console.log(`  Loxone URL: ${config.loxone?.serverUrl || 'not set'}`);
    
    res.json({ 
      success: true,
      message: 'Settings saved. Restart server to apply changes.',
      requiresRestart: true
    });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= FAMILY MEMBERS API =============
app.get('/api/family-members', async (req, res) => {
  try {
    const members = await db.all('SELECT * FROM family_members ORDER BY name');
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/family-members', async (req, res) => {
  try {
    const { id, name, role, email, status, avatar, isAdmin } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO family_members (id, name, role, email, status, avatar, isAdmin, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, role, email, status || 'away', avatar, isAdmin ? 1 : 0, now, now]
    );
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/family-members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, email, status, avatar, isAdmin } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      `UPDATE family_members 
       SET name = ?, role = ?, email = ?, status = ?, avatar = ?, isAdmin = ?, updatedAt = ?
       WHERE id = ?`,
      [name, role, email, status, avatar, isAdmin ? 1 : 0, now, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/family-members/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM family_members WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= MEALS API =============
app.get('/api/meals', async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query;
    
    let query = 'SELECT * FROM meals';
    let params = [];
    
    if (date) {
      query += ' WHERE date = ?';
      params = [date];
    } else if (startDate && endDate) {
      query += ' WHERE date >= ? AND date <= ?';
      params = [startDate, endDate];
    }
    
    query += ' ORDER BY date, type';
    
    const meals = await db.all(query, params);
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meals', async (req, res) => {
  try {
    const { id, date, title, type, notes, addedBy } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO meals (id, date, title, type, notes, addedBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, date, title, type, notes, addedBy, now, now]
    );
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/meals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, notes, addedBy } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      `UPDATE meals 
       SET title = ?, type = ?, notes = ?, addedBy = ?, updatedAt = ?
       WHERE id = ?`,
      [title, type, notes, addedBy, now, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/meals/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM meals WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SHOPPING LISTS API =============
app.get('/api/lists', async (req, res) => {
  try {
    const lists = await db.all('SELECT * FROM shopping_lists ORDER BY createdAt DESC');
    
    // Get items for each list
    for (const list of lists) {
      list.items = await db.all(
        'SELECT * FROM shopping_list_items WHERE listId = ? ORDER BY createdAt',
        [list.id]
      );
    }
    
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lists', async (req, res) => {
  try {
    const { id, name, type = 'grocery', icon = '🛒' } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      'INSERT INTO shopping_lists (id, name, type, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, type, icon, now, now]
    );
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, icon } = req.body;
    const now = new Date().toISOString();
    
    // Build dynamic update query
    const updates = ['updatedAt = ?'];
    const values = [now];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      values.push(icon);
    }
    
    values.push(id);
    
    await db.run(
      `UPDATE shopping_lists SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/lists/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM shopping_lists WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shopping List Items
app.post('/api/lists/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;
    const { id, text, addedBy, category, forMeal, dueDate } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO shopping_list_items (id, listId, text, checked, addedBy, category, forMeal, dueDate, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [id, listId, text, addedBy, category || 'household', forMeal || null, dueDate || null, now, now]
    );
    
    // Auto-sync to Google Tasks (include listId so it syncs to the correct Google list)
    const newItem = { id, listId, text, category: category || 'household', checked: 0, dueDate: dueDate || null };
    syncItemToGoogle(newItem, 'create').catch(err => console.error('Auto-sync error:', err.message));
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lists/:listId/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { text, checked, category, dueDate } = req.body;
    const now = new Date().toISOString();
    
    const updates = [];
    const params = [];
    
    if (text !== undefined) {
      updates.push('text = ?');
      params.push(text);
    }
    if (checked !== undefined) {
      updates.push('checked = ?');
      params.push(checked ? 1 : 0);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (dueDate !== undefined) {
      updates.push('dueDate = ?');
      params.push(dueDate);
    }
    
    updates.push('updatedAt = ?');
    params.push(now);
    params.push(itemId);
    
    await db.run(
      `UPDATE shopping_list_items SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    // Auto-sync to Google Tasks
    const item = await db.get('SELECT * FROM shopping_list_items WHERE id = ?', [itemId]);
    if (item) {
      syncItemToGoogle(item, 'update').catch(err => console.error('Auto-sync error:', err.message));
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/lists/:listId/items/:itemId', async (req, res) => {
  try {
    // Get item before deleting to sync with Google
    const item = await db.get('SELECT * FROM shopping_list_items WHERE id = ?', [req.params.itemId]);
    
    await db.run('DELETE FROM shopping_list_items WHERE id = ?', [req.params.itemId]);
    
    // Auto-sync deletion to Google Tasks
    if (item) {
      syncItemToGoogle(item, 'delete').catch(err => console.error('Auto-sync error:', err.message));
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks with due dates (for homepage and calendar)
app.get('/api/tasks/due', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT i.*, l.name as listName 
      FROM shopping_list_items i 
      JOIN shopping_lists l ON i.listId = l.id 
      WHERE i.dueDate IS NOT NULL
    `;
    const params = [];
    
    if (startDate && endDate) {
      query += ` AND i.dueDate >= ? AND i.dueDate <= ?`;
      params.push(startDate, endDate);
    }
    
    query += ` ORDER BY i.dueDate ASC`;
    
    const tasks = await db.all(query, params);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= CALENDAR EVENTS API (CalDAV + Google Calendar) =============
app.get('/api/events', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const calendarSource = process.env.CALENDAR_SOURCE || 'apple';
    let allEvents = [];
    let sources = [];
    
    // Get events from Apple Calendar (CalDAV)
    if (calendarSource === 'apple' || calendarSource === 'both') {
      if (calDAVService.isInitialized) {
        try {
          const appleEvents = await calDAVService.syncEvents(
            new Date(startDate),
            new Date(endDate)
          );
          appleEvents.forEach(e => e.source = 'apple');
          allEvents.push(...appleEvents);
          sources.push('apple');
        } catch (error) {
          console.error('CalDAV error:', error.message);
        }
      }
    }
    
    // Get events from Google Calendar (all calendars including holidays)
    if ((calendarSource === 'google' || calendarSource === 'both') && GOOGLE_CALENDAR_ENABLED) {
      if (googleCalendarService.isInitialized) {
        try {
          const googleEvents = await googleCalendarService.getAllCalendarEvents(
            new Date(startDate),
            new Date(endDate)
          );
          allEvents.push(...googleEvents);
          sources.push('google');
        } catch (error) {
          console.error('Google Calendar error:', error.message);
        }
      }
    }
    
    // Normalize events format
    const events = allEvents.map(event => ({
      id: event.id,
      title: event.title,
      startDate: event.startDate || event.start,
      endDate: event.endDate || event.end,
      date: event.date || (event.start ? event.start.split('T')[0] : null),
      time: event.time || (event.start && event.start.includes('T') ? event.start.split('T')[1].substring(0, 5) : ''),
      isAllDay: event.isAllDay || event.allDay || false,
      person: event.person || event.calendar || '',
      location: event.location || '',
      notes: event.notes || event.description || '',
      calendarName: event.calendarName || event.calendar || 'Calendar',
      source: event.source || 'unknown',
      color: event.color || (event.source === 'google' ? '#4285f4' : '#007AFF')
    }));
    
    // Store in cache
    for (const event of events) {
      const existing = await db.get('SELECT id FROM calendar_events WHERE id = ?', [event.id]);
      
      if (existing) {
        await db.run(
          `UPDATE calendar_events 
           SET title = ?, startDate = ?, endDate = ?, date = ?, time = ?, 
               isAllDay = ?, person = ?, location = ?, notes = ?, calendarName = ?,
               lastSynced = ?
           WHERE id = ?`,
          [event.title, event.startDate, event.endDate, event.date, event.time,
           event.isAllDay ? 1 : 0, event.person, event.location, event.notes,
           event.calendarName, new Date().toISOString(), event.id]
        );
      } else {
        await db.run(
          `INSERT INTO calendar_events 
           (id, title, startDate, endDate, date, time, isAllDay, person, location, notes, calendarName, lastSynced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [event.id, event.title, event.startDate, event.endDate, event.date, event.time,
           event.isAllDay ? 1 : 0, event.person, event.location, event.notes,
           event.calendarName, new Date().toISOString()]
        );
      }
    }
    
    // Sort events by date and time before returning
    events.sort((a, b) => {
      // First sort by date
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, all-day events come first
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (a.isAllDay && b.isAllDay) return 0;
      
      // If both have times, sort by time
      return (a.time || '').localeCompare(b.time || '');
    });
    
    res.json({ events, sources, calendarSource });
  } catch (error) {
    console.error('Calendar error:', error);
    
    // Fall back to cached events if both calendars fail
    try {
      const cachedEvents = await db.all(
        'SELECT * FROM calendar_events WHERE date >= ? AND date <= ? ORDER BY date, time',
        [req.query.startDate, req.query.endDate]
      );
      
      res.json({
        events: cachedEvents,
        cached: true,
        error: error.message
      });
    } catch (dbError) {
      res.status(500).json({ error: 'Calendar and cache both failed' });
    }
  }
});

// ============= SETTINGS API =============
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.all('SELECT key, value FROM settings');
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const now = new Date().toISOString();
    
    const existing = await db.get('SELECT key FROM settings WHERE key = ?', [key]);
    
    if (existing) {
      await db.run('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?', [value, now, key]);
    } else {
      await db.run('INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)', [key, value, now]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= GOOGLE TASKS SYNC API =============

// Redirect to Google OAuth2 authorization
app.get('/api/google/auth', async (req, res) => {
  try {
    const authUrl = googleTasksService.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Get OAuth2 authorization URL (JSON response)
app.get('/api/google/auth-url', async (req, res) => {
  try {
    const authUrl = googleTasksService.getAuthUrl();
    res.json({ url: authUrl, initialized: googleTasksService.isInitialized });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth2 callback - handles both Google Tasks and Google Calendar
app.get('/api/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }
    
    // Handle auth for Google Tasks (this saves the tokens)
    await googleTasksService.handleAuthCallback(code);
    
    // Initialize Google Calendar using the saved tokens (don't use the code again)
    if (GOOGLE_CALENDAR_ENABLED) {
      await googleCalendarService.initialize();
    }
    
    // Redirect to app with success message
    res.send(`
      <html>
        <head><title>Google Connected</title></head>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #1a1a1a; color: #fff;">
          <h1>✓ Google Connected!</h1>
          <p>You can now close this window and return to the app.</p>
          <p>Shopping list will sync with Google Tasks.</p>
          ${GOOGLE_CALENDAR_ENABLED ? '<p>Calendar will sync with Google Calendar.</p>' : ''}
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

// Get Google Tasks lists
app.get('/api/google/lists', async (req, res) => {
  try {
    if (!googleTasksService.isInitialized) {
      return res.status(401).json({ 
        error: 'Google Tasks not authorized',
        authUrl: googleTasksService.getAuthUrl()
      });
    }
    
    const lists = await googleTasksService.getTaskLists();
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tasks from the shopping list
app.get('/api/google/tasks', async (req, res) => {
  try {
    if (!googleTasksService.isInitialized) {
      return res.status(401).json({ 
        error: 'Google Tasks not authorized',
        authUrl: googleTasksService.getAuthUrl()
      });
    }
    
    const tasks = await googleTasksService.getTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new task
app.post('/api/google/tasks', async (req, res) => {
  try {
    if (!googleTasksService.isInitialized) {
      return res.status(401).json({ error: 'Google Tasks not authorized' });
    }
    
    const taskId = await googleTasksService.createTask(req.body);
    res.json({ success: true, id: taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a task
app.put('/api/google/tasks/:taskId', async (req, res) => {
  try {
    if (!googleTasksService.isInitialized) {
      return res.status(401).json({ error: 'Google Tasks not authorized' });
    }
    
    const result = await googleTasksService.updateTask(req.params.taskId, req.body);
    res.json({ success: true, task: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a task
app.delete('/api/google/tasks/:taskId', async (req, res) => {
  try {
    if (!googleTasksService.isInitialized) {
      return res.status(401).json({ error: 'Google Tasks not authorized' });
    }
    
    await googleTasksService.deleteTask(req.params.taskId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync shopping list with Google Tasks
app.post('/api/google/sync', async (req, res) => {
  try {
    if (!googleTasksService.isInitialized) {
      return res.status(401).json({ 
        error: 'Google Tasks not authorized',
        authUrl: googleTasksService.getAuthUrl()
      });
    }
    
    console.log('📱 Manual Google Tasks sync requested');
    
    // Get shopping list items from database
    const shoppingLists = await db.all('SELECT * FROM shopping_lists');
    let allItems = [];
    
    for (const list of shoppingLists) {
      const items = await db.all(
        'SELECT * FROM shopping_list_items WHERE listId = ?',
        [list.id]
      );
      allItems = allItems.concat(items.map(item => ({
        ...item,
        name: item.text, // Map 'text' to 'name' for GoogleTasksService
        listName: list.name
      })));
    }
    
    const result = await googleTasksService.performSync(allItems);
    
    // Handle sync events - update local DB with Google Task IDs
    for (const item of allItems) {
      if (result.syncedItems && result.syncedItems[item.id]) {
        await db.run(
          'UPDATE shopping_list_items SET googleTaskId = ? WHERE id = ?',
          [result.syncedItems[item.id], item.id]
        );
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Google Tasks sync error:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

// Get Google Tasks status
app.get('/api/google/status', async (req, res) => {
  try {
    res.json({
      initialized: googleTasksService.isInitialized,
      taskListId: googleTasksService.taskListId,
      taskListName: googleTasksService.taskListName,
      authUrl: googleTasksService.isInitialized ? null : googleTasksService.getAuthUrl()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= GOOGLE CALENDAR API =============
// Get Google Calendar status
app.get('/api/google/calendar/status', async (req, res) => {
  try {
    res.json({
      enabled: GOOGLE_CALENDAR_ENABLED,
      initialized: googleCalendarService.isInitialized,
      calendarId: googleCalendarService.calendarId,
      calendarSource: CALENDAR_SOURCE,
      authUrl: googleCalendarService.isInitialized ? null : googleCalendarService.getAuthUrl()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Google Calendar auth URL (includes calendar scope)
app.get('/api/google/calendar/auth-url', async (req, res) => {
  try {
    res.json({
      url: googleCalendarService.getAuthUrl()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of Google Calendars
app.get('/api/google/calendar/list', async (req, res) => {
  try {
    if (!googleCalendarService.isInitialized) {
      return res.status(401).json({ 
        error: 'Google Calendar not authorized',
        authUrl: googleCalendarService.getAuthUrl()
      });
    }
    
    const calendars = await googleCalendarService.getCalendarList();
    res.json(calendars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get events from Google Calendar
app.get('/api/google/calendar/events', async (req, res) => {
  try {
    if (!googleCalendarService.isInitialized) {
      return res.status(401).json({ 
        error: 'Google Calendar not authorized',
        authUrl: googleCalendarService.getAuthUrl()
      });
    }
    
    const { startDate, endDate, calendarId } = req.query;
    const events = await googleCalendarService.getEvents(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      calendarId
    );
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= LOXONE API =============
app.get('/api/loxone/rooms', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured or unavailable' });
    }
    
    const rooms = await loxoneService.getRoomsInfo();
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching Loxone rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/loxone/status', async (req, res) => {
  try {
    res.json({
      initialized: loxoneService.isInitialized,
      configured: !!(process.env.LOXONE_SERVER_URL && process.env.LOXONE_USERNAME)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/loxone/energy', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const energy = await loxoneService.getEnergyData();
    res.json(energy);
  } catch (error) {
    console.error('Error fetching energy data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/loxone/sensors', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const sensors = await loxoneService.getInfoSensors();
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/loxone/lights', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const lights = await loxoneService.getLights();
    res.json(lights);
  } catch (error) {
    console.error('Error fetching lights:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle a light on/off
app.post('/api/loxone/lights/:uuid/toggle', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const { uuid } = req.params;
    const { on } = req.body;
    
    const result = await loxoneService.toggleLight(uuid, on);
    
    // Broadcast the change to all connected WebSocket clients
    broadcast({
      type: 'loxone_state_update',
      updates: [{
        type: 'light',
        uuid: uuid,
        isOn: on,
        value: on ? 1 : 0
      }]
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error toggling light:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set light mood
app.post('/api/loxone/lights/:uuid/mood', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const { uuid } = req.params;
    const { mood } = req.body;
    
    const result = await loxoneService.setLightMood(uuid, mood);
    
    // Broadcast the change
    broadcast({
      type: 'loxone_state_update',
      updates: [{
        type: 'light',
        uuid: uuid,
        value: mood,
        isOn: mood > 0
      }]
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error setting light mood:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to explore all control types
app.get('/api/loxone/debug/types', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const types = await loxoneService.getControlTypes();
    res.json(types);
  } catch (error) {
    console.error('Error fetching control types:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to get details of a specific control
app.get('/api/loxone/debug/control/:uuid', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const details = await loxoneService.getControlDetails(req.params.uuid);
    if (!details) {
      return res.status(404).json({ error: 'Control not found' });
    }
    res.json(details);
  } catch (error) {
    console.error('Error fetching control details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to test raw Loxone queries
app.get('/api/loxone/debug/query', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const path = req.query.path;
    if (!path) {
      return res.status(400).json({ error: 'path query parameter required' });
    }
    
    const result = await loxoneService.debugQuery(path);
    res.json(result);
  } catch (error) {
    console.error('Error with debug query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Play audio on Loxone audio zone
app.post('/api/loxone/audio/:uuid/play', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const { uuid } = req.params;
    const { sound } = req.body; // Optional: specific sound/bell number
    
    const result = await loxoneService.playAudio(uuid, sound);
    res.json(result);
  } catch (error) {
    console.error('Error playing audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check WebSocket state cache
app.get('/api/loxone/debug/ws-state', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.status(503).json({ error: 'Loxone service not configured' });
    }
    
    const stateCount = loxoneService.stateValues ? loxoneService.stateValues.size : 0;
    const wsConnected = loxoneService.wsConnected || false;
    
    // Get sample of cached states
    const samples = [];
    if (loxoneService.stateValues) {
      let count = 0;
      for (const [uuid, value] of loxoneService.stateValues) {
        samples.push({ uuid, value });
        if (++count >= 20) break;
      }
    }
    
    res.json({
      wsConnected,
      stateCount,
      samples
    });
  } catch (error) {
    console.error('Error getting WS state:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= RECIPES API =============
// Search recipes by name
app.get('/api/recipes/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }
    
    const recipes = await recipeService.searchByName(q);
    res.json(recipes);
  } catch (error) {
    console.error('Recipe search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recipe categories
app.get('/api/recipes/categories', async (req, res) => {
  try {
    const categories = await recipeService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get random recipe
app.get('/api/recipes/random', async (req, res) => {
  try {
    const recipe = await recipeService.getRandom();
    if (!recipe) {
      return res.status(404).json({ error: 'No recipe found' });
    }
    res.json(recipe);
  } catch (error) {
    console.error('Random recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recipes by category
app.get('/api/recipes/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const recipes = await recipeService.getByCategory(category);
    res.json(recipes);
  } catch (error) {
    console.error('Category recipes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recipe by ID
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await recipeService.getById(id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    console.error('Recipe fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize CalDAV on startup
(async () => {
  try {
    if (process.env.CALDAV_USERNAME && process.env.CALDAV_PASSWORD) {
      await calDAVService.initialize();
      console.log('✓ CalDAV service ready');
    } else {
      console.warn('⚠ CalDAV credentials not configured - calendar sync disabled');
    }
  } catch (error) {
    console.error('✗ CalDAV initialization failed:', error.message);
    console.log('→ Calendar sync will use cached data only');
  }
  
  // Initialize Loxone (optional)
  if (process.env.LOXONE_SERVER_URL && process.env.LOXONE_USERNAME) {
    try {
      await loxoneService.initialize();
    } catch (error) {
      console.warn('⚠ Loxone initialization failed:', error.message);
    }
  }
  
  // Initialize Google Tasks (optional)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      await googleTasksService.initialize();
      // Start automatic bidirectional sync
      if (googleTasksService.isInitialized) {
        startGoogleSyncTimer();
        // Initial sync
        setTimeout(() => performBidirectionalSync(), 2000);
      }
    } catch (error) {
      console.warn('⚠ Google Tasks initialization:', error.message);
      console.log(`  → Authorize at: ${googleTasksService.getAuthUrl()}`);
    }
  } else {
    console.warn('⚠ Google Tasks credentials not configured - shopping list sync disabled');
  }
  
  // Initialize Google Calendar (optional)
  if (GOOGLE_CALENDAR_ENABLED && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      await googleCalendarService.initialize();
    } catch (error) {
      console.warn('⚠ Google Calendar initialization:', error.message);
      console.log(`  → Authorize at: ${googleCalendarService.getAuthUrl()}`);
    }
  }
})();

// ============= WEBSOCKET SERVER FOR REAL-TIME UPDATES =============
const http = require('http');
const WebSocket = require('ws');

// Create HTTP server from Express app
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Track connected clients
const wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  wsClients.add(ws);
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Family Planner' }));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket client error:', error.message);
    wsClients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Register Loxone state update callback to broadcast changes
if (loxoneService) {
  loxoneService.onStateUpdate((updates) => {
    if (wsClients.size > 0) {
      broadcast({
        type: 'loxone_state_update',
        updates: updates
      });
    }
  });
  
  // Start Loxone polling when service is initialized
  // This polls the REST API and broadcasts changes via WebSocket
  setTimeout(() => {
    if (loxoneService.isInitialized) {
      loxoneService.startPolling(5000); // Poll every 5 seconds
    }
  }, 3000);
}

// Start Server with WebSocket support
server.listen(PORT, () => {
  console.log(`🚀 Family Planner Backend running on http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   Database: ${process.env.DATABASE_PATH || './data/family-planner.db'}`);
  console.log(`   CalDAV: ${process.env.CALDAV_SERVER_URL || 'not configured'}`);
  console.log(`   Google Calendar: ${googleCalendarService.isInitialized ? 'connected' : (GOOGLE_CALENDAR_ENABLED ? 'not authorized' : 'disabled')}`);
  console.log(`   Calendar Source: ${CALENDAR_SOURCE}`);
  console.log(`   Loxone: ${process.env.LOXONE_SERVER_URL || 'not configured'}`);
  console.log(`   Google Tasks: ${googleTasksService.isInitialized ? 'connected' : 'not authorized'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹ Shutting down gracefully...');
  if (googleSyncTimer) clearInterval(googleSyncTimer);
  if (loxoneService) loxoneService.stopPolling();
  db.close();
  process.exit(0);
});
