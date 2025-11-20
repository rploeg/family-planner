const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err.message);
      } else {
        console.log('✓ Connected to SQLite database');
      }
    });
    
    this.initializeTables();
  }

  initializeTables() {
    this.db.serialize(() => {
      // Family Members table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS family_members (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT,
          email TEXT,
          status TEXT DEFAULT 'away',
          avatar TEXT,
          isAdmin INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Rooms table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          temperature REAL,
          humidity REAL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Meals table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS meals (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          notes TEXT,
          addedBy TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Shopping Lists table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS shopping_lists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Shopping List Items table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS shopping_list_items (
          id TEXT PRIMARY KEY,
          listId TEXT NOT NULL,
          text TEXT NOT NULL,
          checked INTEGER DEFAULT 0,
          addedBy TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (listId) REFERENCES shopping_lists(id) ON DELETE CASCADE
        )
      `);

      // Settings table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Calendar Events Cache table (for CalDAV)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          startDate TEXT NOT NULL,
          endDate TEXT,
          date TEXT NOT NULL,
          time TEXT,
          isAllDay INTEGER DEFAULT 0,
          person TEXT,
          location TEXT,
          notes TEXT,
          calendarName TEXT,
          lastSynced TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better query performance
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_events_date ON calendar_events(date)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_list_items_listId ON shopping_list_items(listId)`);

      console.log('✓ Database tables initialized');
    });
  }

  // Generic query methods
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    this.db.close((err) => {
      if (err) console.error('Error closing database:', err.message);
      else console.log('✓ Database connection closed');
    });
  }
}

module.exports = DatabaseManager;
