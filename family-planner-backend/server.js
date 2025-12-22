require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const DatabaseManager = require('./database/DatabaseManager');
const CalDAVService = require('./services/CalDAVService');
const LoxoneService = require('./services/LoxoneService');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Database
const db = new DatabaseManager(process.env.DATABASE_PATH || './data/family-planner.db');

// Initialize CalDAV Service
const calDAVService = new CalDAVService({
  serverUrl: process.env.CALDAV_SERVER_URL,
  username: process.env.CALDAV_USERNAME,
  password: process.env.CALDAV_PASSWORD
});

// Initialize Loxone Service (optional)
const loxoneService = new LoxoneService({
  serverUrl: process.env.LOXONE_SERVER_URL,
  username: process.env.LOXONE_USERNAME,
  password: process.env.LOXONE_PASSWORD
});

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
    const { id, text, addedBy } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO shopping_list_items (id, listId, text, checked, addedBy, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, ?, ?, ?)`,
      [id, listId, text, addedBy, now, now]
    );
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lists/:listId/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { text, checked } = req.body;
    const now = new Date().toISOString();
    
    await db.run(
      'UPDATE shopping_list_items SET text = ?, checked = ?, updatedAt = ? WHERE id = ?',
      [text, checked ? 1 : 0, now, itemId]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/lists/:listId/items/:itemId', async (req, res) => {
  try {
    await db.run('DELETE FROM shopping_list_items WHERE id = ?', [req.params.itemId]);
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
})();

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Family Planner Backend running on http://localhost:${PORT}`);
  console.log(`   Database: ${process.env.DATABASE_PATH || './data/family-planner.db'}`);
  console.log(`   CalDAV: ${process.env.CALDAV_SERVER_URL || 'not configured'}`);
  console.log(`   Loxone: ${process.env.LOXONE_SERVER_URL || 'not configured'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹ Shutting down gracefully...');
  db.close();
  process.exit(0);
});
