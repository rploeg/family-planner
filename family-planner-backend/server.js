const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const DatabaseManager = require('./database/DatabaseManager');
const CalDAVService = require('./services/CalDAVService');
const GoogleTasksService = require('./services/GoogleTasksService');
const LoxoneService = require('./services/LoxoneService');

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

// Initialize Loxone Service (optional)
const loxoneService = new LoxoneService({
  serverUrl: process.env.LOXONE_SERVER_URL,
  username: process.env.LOXONE_USERNAME,
  password: process.env.LOXONE_PASSWORD
});

// Google Tasks Sync Configuration
const GOOGLE_SYNC_INTERVAL = parseInt(process.env.GOOGLE_SYNC_INTERVAL) || 60; // seconds
let googleSyncTimer = null;

// Helper function to sync a single item to Google Tasks
async function syncItemToGoogle(item, action = 'upsert') {
  if (!googleTasksService.isInitialized) return null;
  
  try {
    if (action === 'create' || (action === 'upsert' && !item.googleTaskId)) {
      const googleId = await googleTasksService.createTask({
        name: item.text,
        notes: item.category || '',
        completed: item.checked === 1
      });
      // Update the database with the Google Task ID
      await db.run(
        'UPDATE shopping_list_items SET googleTaskId = ? WHERE id = ?',
        [googleId, item.id]
      );
      console.log(`  ↑ Synced to Google Tasks: ${item.text}`);
      return googleId;
    } else if (action === 'update' && item.googleTaskId) {
      await googleTasksService.updateTask(item.googleTaskId, {
        title: item.text,
        notes: item.category || '',
        completed: item.checked === 1
      });
      console.log(`  ↔ Updated in Google Tasks: ${item.text}`);
      return item.googleTaskId;
    } else if (action === 'delete' && item.googleTaskId) {
      await googleTasksService.deleteTask(item.googleTaskId);
      console.log(`  ↓ Deleted from Google Tasks: ${item.text}`);
      return null;
    }
  } catch (error) {
    console.error(`  ✗ Google sync failed for ${item.text}:`, error.message);
  }
  return null;
}

// Bidirectional sync function
async function performBidirectionalSync() {
  if (!googleTasksService.isInitialized) return;
  
  try {
    // Get all items from database
    const dbItems = await db.all('SELECT * FROM shopping_list_items');
    
    // Get all tasks from Google
    const googleTasks = await googleTasksService.getTasks();
    
    // Create lookup maps
    const dbByGoogleId = new Map(dbItems.filter(i => i.googleTaskId).map(i => [i.googleTaskId, i]));
    const googleById = new Map(googleTasks.map(t => [t.id, t]));
    
    let created = 0, updated = 0, pulledNew = 0, pulledUpdates = 0, deleted = 0;
    
    // Sync local items to Google (items without googleTaskId)
    for (const item of dbItems) {
      if (!item.googleTaskId) {
        await syncItemToGoogle(item, 'create');
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
        await db.run(
          `INSERT INTO shopping_list_items (id, listId, text, checked, addedBy, category, createdAt, updatedAt, googleTaskId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId, 'list1', googleTask.title, googleTask.completed ? 1 : 0, 'Google', googleTask.notes || 'household', now, now, googleTask.id]
        );
        console.log(`  ↓ Pulled from Google Tasks: ${googleTask.title}`);
        pulledNew++;
      } else {
        // Check if Google version is newer and different
        const googleUpdated = new Date(googleTask.updatedAt);
        const dbUpdated = new Date(dbItem.updatedAt);
        
        if (googleUpdated > dbUpdated) {
          // Google is newer - update local
          const googleChecked = googleTask.completed ? 1 : 0;
          if (dbItem.text !== googleTask.title || dbItem.checked !== googleChecked) {
            await db.run(
              `UPDATE shopping_list_items SET text = ?, checked = ?, updatedAt = ? WHERE id = ?`,
              [googleTask.title, googleChecked, googleTask.updatedAt, dbItem.id]
            );
            console.log(`  ↓ Updated from Google: ${googleTask.title}`);
            pulledUpdates++;
          }
        } else if (dbUpdated > googleUpdated) {
          // Local is newer - update Google
          await syncItemToGoogle(dbItem, 'update');
          updated++;
        }
      }
    }
    
    // Check for items deleted from Google
    for (const item of dbItems) {
      if (item.googleTaskId && !googleById.has(item.googleTaskId)) {
        // Task was deleted from Google - delete locally too
        await db.run('DELETE FROM shopping_list_items WHERE id = ?', [item.id]);
        console.log(`  ↓ Deleted (removed from Google): ${item.text}`);
        deleted++;
      }
    }
    
    if (created + updated + pulledNew + pulledUpdates + deleted > 0) {
      console.log(`✓ Bidirectional sync: ↑${created} created, ↔${updated} updated, ↓${pulledNew} new, ↓${pulledUpdates} updates, ✗${deleted} deleted`);
    }
    
  } catch (error) {
    console.error('Bidirectional sync error:', error.message);
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
    database: 'connected',
    caldav: calDAVService.isInitialized ? 'connected' : 'disconnected'
  });
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
    const { id, name } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      'INSERT INTO shopping_lists (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      [id, name, now, now]
    );
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      'UPDATE shopping_lists SET name = ?, updatedAt = ? WHERE id = ?',
      [name, now, id]
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
    const { id, text, addedBy, category, forMeal } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO shopping_list_items (id, listId, text, checked, addedBy, category, forMeal, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [id, listId, text, addedBy, category || 'household', forMeal || null, now, now]
    );
    
    // Auto-sync to Google Tasks
    const newItem = { id, text, category: category || 'household', checked: 0 };
    syncItemToGoogle(newItem, 'create').catch(err => console.error('Auto-sync error:', err.message));
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lists/:listId/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { text, checked, category } = req.body;
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

// ============= CALENDAR EVENTS API (CalDAV) =============
app.get('/api/events', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    // Sync from CalDAV
    const events = await calDAVService.syncEvents(
      new Date(startDate),
      new Date(endDate)
    );
    
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
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, all-day events come first
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (a.isAllDay && b.isAllDay) return 0;
      
      // If both have times, sort by time
      return a.time.localeCompare(b.time);
    });
    
    res.json(events);
  } catch (error) {
    console.error('CalDAV error:', error);
    
    // Fall back to cached events if CalDAV fails
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
      res.status(500).json({ error: 'CalDAV and cache both failed' });
    }
  }
});

// ============= SETTINGS API =============
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.all('SELECT key, value FROM settings');
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
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

// OAuth2 callback
app.get('/api/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }
    
    await googleTasksService.handleAuthCallback(code);
    
    // Redirect to app with success message
    res.send(`
      <html>
        <head><title>Google Tasks Connected</title></head>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #1a1a1a; color: #fff;">
          <h1>✓ Google Tasks Connected!</h1>
          <p>You can now close this window and return to the app.</p>
          <p>Shopping list will sync with Google Tasks.</p>
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

app.get('/api/loxone/suggestions', async (req, res) => {
  try {
    if (!loxoneService.isInitialized) {
      return res.json([]); // Return empty suggestions if Loxone not configured
    }
    
    // Get upcoming events from calendar
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const events = await calDAVService.getEvents(
      now.toISOString().split('T')[0],
      tomorrow.toISOString().split('T')[0]
    );
    
    const rooms = await loxoneService.getRoomsInfo();
    const suggestions = loxoneService.generateSuggestions(rooms, events);
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error generating suggestions:', error);
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
})();

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Family Planner Backend running on http://localhost:${PORT}`);
  console.log(`   Database: ${process.env.DATABASE_PATH || './data/family-planner.db'}`);
  console.log(`   CalDAV: ${process.env.CALDAV_SERVER_URL || 'not configured'}`);
  console.log(`   Loxone: ${process.env.LOXONE_SERVER_URL || 'not configured'}`);
  console.log(`   Google Tasks: ${googleTasksService.isInitialized ? 'connected' : 'not authorized'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹ Shutting down gracefully...');
  if (googleSyncTimer) clearInterval(googleSyncTimer);
  db.close();
  process.exit(0);
});
