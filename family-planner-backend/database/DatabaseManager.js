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
          category TEXT DEFAULT 'household',
          forMeal TEXT,
          icloudId TEXT,
          lastSynced TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (listId) REFERENCES shopping_lists(id) ON DELETE CASCADE
        )
      `);
      
      // Add category column to existing tables if it doesn't exist
      this.db.run(`
        ALTER TABLE shopping_list_items ADD COLUMN category TEXT DEFAULT 'household'
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding category column:', err.message);
        }
      });
      
      // Add forMeal column to existing tables if it doesn't exist
      this.db.run(`
        ALTER TABLE shopping_list_items ADD COLUMN forMeal TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding forMeal column:', err.message);
        }
      });
      
      // Add icloudId column for reminder sync
      this.db.run(`
        ALTER TABLE shopping_list_items ADD COLUMN icloudId TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding icloudId column:', err.message);
        }
      });
      
      // Add lastSynced column for reminder sync
      this.db.run(`
        ALTER TABLE shopping_list_items ADD COLUMN lastSynced TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding lastSynced column:', err.message);
        }
      });

      // Add googleTaskId column for Google Tasks sync
      this.db.run(`
        ALTER TABLE shopping_list_items ADD COLUMN googleTaskId TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding googleTaskId column:', err.message);
        }
      });

      // Add dueDate column for task due dates
      this.db.run(`
        ALTER TABLE shopping_list_items ADD COLUMN dueDate TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding dueDate column:', err.message);
        }
      });

      // Add type column to shopping_lists (grocery or tasks)
      this.db.run(`
        ALTER TABLE shopping_lists ADD COLUMN type TEXT DEFAULT 'grocery'
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding type column to shopping_lists:', err.message);
        }
      });

      // Add icon column to shopping_lists
      this.db.run(`
        ALTER TABLE shopping_lists ADD COLUMN icon TEXT DEFAULT '🛒'
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding icon column to shopping_lists:', err.message);
        }
      });

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

      // Daily routines and checklist steps
      this.db.run(`
        CREATE TABLE IF NOT EXISTS routines (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          timeOfDay TEXT DEFAULT 'after_school',
          childId TEXT,
          daysOfWeek TEXT DEFAULT '1,2,3,4,5,6,0',
          isActive INTEGER DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS routine_steps (
          id TEXT PRIMARY KEY,
          routineId TEXT NOT NULL,
          text TEXT NOT NULL,
          sortOrder INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (routineId) REFERENCES routines(id) ON DELETE CASCADE
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS routine_completions (
          id TEXT PRIMARY KEY,
          routineId TEXT NOT NULL,
          stepId TEXT NOT NULL,
          date TEXT NOT NULL,
          childId TEXT,
          completed INTEGER DEFAULT 0,
          completedAt TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(stepId, date, childId),
          FOREIGN KEY (routineId) REFERENCES routines(id) ON DELETE CASCADE,
          FOREIGN KEY (stepId) REFERENCES routine_steps(id) ON DELETE CASCADE
        )
      `);

      // Homework planner
      this.db.run(`
        CREATE TABLE IF NOT EXISTS homework_items (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          subject TEXT,
          childId TEXT,
          dueDate TEXT NOT NULL,
          status TEXT DEFAULT 'open',
          priority TEXT DEFAULT 'normal',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Chores and points
      this.db.run(`
        CREATE TABLE IF NOT EXISTS chores (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          childId TEXT,
          points INTEGER DEFAULT 1,
          frequency TEXT DEFAULT 'weekly',
          dueDate TEXT,
          status TEXT DEFAULT 'open',
          completedAt TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Screen-time tokens wallet and transactions
      this.db.run(`
        CREATE TABLE IF NOT EXISTS token_wallets (
          childId TEXT PRIMARY KEY,
          balance INTEGER DEFAULT 0,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS token_transactions (
          id TEXT PRIMARY KEY,
          childId TEXT NOT NULL,
          delta INTEGER NOT NULL,
          reason TEXT,
          sourceType TEXT,
          sourceId TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Parent-only emergency card (single record)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS emergency_cards (
          id TEXT PRIMARY KEY,
          householdDoctor TEXT,
          allergies TEXT,
          medications TEXT,
          emergencyContacts TEXT,
          notes TEXT,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Family meeting notes and decisions/actions
      this.db.run(`
        CREATE TABLE IF NOT EXISTS family_meetings (
          id TEXT PRIMARY KEY,
          meetingDate TEXT NOT NULL,
          title TEXT,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS family_meeting_actions (
          id TEXT PRIMARY KEY,
          meetingId TEXT NOT NULL,
          text TEXT NOT NULL,
          owner TEXT,
          dueDate TEXT,
          status TEXT DEFAULT 'open',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (meetingId) REFERENCES family_meetings(id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better query performance
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_events_date ON calendar_events(date)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_list_items_listId ON shopping_list_items(listId)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_routine_steps_routineId ON routine_steps(routineId)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_routine_completions_date ON routine_completions(date)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_homework_dueDate ON homework_items(dueDate)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_chores_dueDate ON chores(dueDate)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_token_tx_child ON token_transactions(childId, createdAt)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_meeting_actions_meetingId ON family_meeting_actions(meetingId)`);

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
