const { EventEmitter } = require('events');

class ReminderSyncService extends EventEmitter {
  constructor(caldavService, database) {
    super();
    this.caldavService = caldavService;
    this.db = database;
    this.listName = 'Boodschappen'; // The CalDAV reminder list name - will create if not found
    this.dbListName = 'Groceries'; // The actual database list name
    this.isSyncing = false;
  }

  /**
   * Perform a full bidirectional sync between the app and iCloud Reminders
   */
  async performSync() {
    if (this.isSyncing) {
      console.log('⏸️  Sync already in progress, skipping...');
      return { status: 'skipped', message: 'Sync already in progress' };
    }

    this.isSyncing = true;
    const syncResult = {
      status: 'success',
      timestamp: new Date().toISOString(),
      created: 0,
      updated: 0,
      deleted: 0,
      conflicts: []
    };

    try {
      console.log('\n🔄 Starting reminder sync...');

      // Step 1: Fetch reminders from iCloud
      const icloudReminders = await this.caldavService.syncReminders(this.listName);
      
      // Step 2: Fetch shopping list items from database
      const dbItems = await this.getShoppingListItems();

      // Step 3: Create maps for easy lookup
      const icloudMap = new Map(icloudReminders.map(r => [r.id, r]));
      const dbMap = new Map(dbItems.map(i => [i.icloudId, i]));

      // Step 4: Sync from iCloud to Database (iPhone → App)
      for (const icloudReminder of icloudReminders) {
        const dbItem = dbMap.get(icloudReminder.id);

        if (!dbItem) {
          // New item from iPhone - create in database
          await this.createItemFromReminder(icloudReminder);
          syncResult.created++;
        } else {
          // Item exists - check for updates
          const conflict = await this.syncItemFromReminder(icloudReminder, dbItem);
          if (conflict) {
            syncResult.conflicts.push(conflict);
          } else {
            syncResult.updated++;
          }
        }
      }

      // Step 5: Sync from Database to iCloud (App → iPhone)
      for (const dbItem of dbItems) {
        if (!dbItem.icloudId) {
          // New item from app - create in iCloud
          const icloudId = await this.caldavService.createReminder(this.listName, dbItem);
          await this.updateItemIcloudId(dbItem.id, icloudId);
          syncResult.created++;
        } else if (!icloudMap.has(dbItem.icloudId)) {
          // Item deleted from iPhone - delete from database
          await this.deleteItem(dbItem.id);
          syncResult.deleted++;
        }
      }

      console.log(`✓ Sync complete: ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.deleted} deleted, ${syncResult.conflicts.length} conflicts`);
      
      this.emit('syncComplete', syncResult);
      return syncResult;

    } catch (error) {
      console.error('✗ Sync failed:', error.message);
      syncResult.status = 'error';
      syncResult.error = error.message;
      return syncResult;
    } finally {
      this.isSyncing = false;
    }
  }

  async getShoppingListItems() {
    return new Promise((resolve, reject) => {
      // Get the shopping list ID from database (using dbListName)
      this.db.db.get(
        `SELECT id FROM shopping_lists WHERE name = ?`,
        [this.dbListName],
        (err, list) => {
          if (err) {
            reject(err);
            return;
          }

          if (!list) {
            // List doesn't exist, return empty array
            resolve([]);
            return;
          }

          // Get all items from this list
          this.db.db.all(
            `SELECT * FROM shopping_list_items WHERE listId = ?`,
            [list.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        }
      );
    });
  }

  async createItemFromReminder(reminder) {
    return new Promise((resolve, reject) => {
      // Get the shopping list ID from database
      this.db.db.get(
        `SELECT id FROM shopping_lists WHERE name = ?`,
        [this.dbListName],
        (err, list) => {
          if (err) {
            reject(err);
            return;
          }

          if (!list) {
            reject(new Error(`Shopping list "${this.listName}" not found`));
            return;
          }

          const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const now = new Date().toISOString();

          this.db.db.run(
            `INSERT INTO shopping_list_items 
            (id, listId, text, checked, addedBy, category, forMeal, icloudId, lastSynced, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              list.id,
              reminder.text,
              reminder.checked ? 1 : 0,
              reminder.addedBy,
              reminder.category,
              reminder.forMeal,
              reminder.id,
              now,
              reminder.created,
              reminder.lastModified
            ],
            (err) => {
              if (err) reject(err);
              else {
                console.log(`  ✓ Created item from iPhone: ${reminder.text}`);
                resolve(id);
              }
            }
          );
        }
      );
    });
  }

  async syncItemFromReminder(reminder, dbItem) {
    // Check timestamps to determine which is newer
    const reminderModified = new Date(reminder.lastModified);
    const dbModified = new Date(dbItem.updatedAt);
    const lastSynced = dbItem.lastSynced ? new Date(dbItem.lastSynced) : new Date(0);

    // If both were modified after last sync, we have a conflict
    if (reminderModified > lastSynced && dbModified > lastSynced) {
      console.log(`  ⚠️  Conflict detected for: ${dbItem.text}`);
      
      // Simple conflict resolution: iPhone wins
      await this.updateItemFromReminder(reminder, dbItem.id);
      
      return {
        itemId: dbItem.id,
        text: dbItem.text,
        resolution: 'icloud-wins',
        message: 'Item updated from iPhone (iPhone changes take precedence)'
      };
    }

    // If iPhone version is newer, update database
    if (reminderModified > dbModified) {
      await this.updateItemFromReminder(reminder, dbItem.id);
      return null;
    }

    // If database version is newer, update iCloud
    if (dbModified > reminderModified) {
      await this.caldavService.updateReminder(this.listName, reminder.id, {
        text: dbItem.text,
        checked: dbItem.checked === 1,
        category: dbItem.category,
        forMeal: dbItem.forMeal,
        addedBy: dbItem.addedBy
      });
      
      // Update lastSynced
      await this.updateItemSyncTimestamp(dbItem.id);
      console.log(`  ✓ Updated iPhone from app: ${dbItem.text}`);
    }

    return null;
  }

  async updateItemFromReminder(reminder, itemId) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.db.run(
        `UPDATE shopping_list_items 
        SET text = ?, checked = ?, addedBy = ?, category = ?, forMeal = ?, 
            lastSynced = ?, updatedAt = ?
        WHERE id = ?`,
        [
          reminder.text,
          reminder.checked ? 1 : 0,
          reminder.addedBy,
          reminder.category,
          reminder.forMeal,
          now,
          reminder.lastModified,
          itemId
        ],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`  ✓ Updated item from iPhone: ${reminder.text}`);
            resolve();
          }
        }
      );
    });
  }

  async updateItemIcloudId(itemId, icloudId) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.db.run(
        `UPDATE shopping_list_items SET icloudId = ?, lastSynced = ? WHERE id = ?`,
        [icloudId, now, itemId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async updateItemSyncTimestamp(itemId) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      this.db.db.run(
        `UPDATE shopping_list_items SET lastSynced = ? WHERE id = ?`,
        [now, itemId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteItem(itemId) {
    return new Promise((resolve, reject) => {
      this.db.db.run(
        `DELETE FROM shopping_list_items WHERE id = ?`,
        [itemId],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`  ✓ Deleted item (removed from iPhone)`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Sync a single item to iCloud after local changes
   */
  async syncSingleItem(itemId) {
    try {
      const item = await this.getItemById(itemId);
      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }

      if (item.icloudId) {
        // Update existing reminder
        await this.caldavService.updateReminder(this.listName, item.icloudId, {
          text: item.text,
          checked: item.checked === 1,
          category: item.category,
          forMeal: item.forMeal,
          addedBy: item.addedBy
        });
      } else {
        // Create new reminder
        const icloudId = await this.caldavService.createReminder(this.listName, item);
        await this.updateItemIcloudId(item.id, icloudId);
      }

      await this.updateItemSyncTimestamp(item.id);
      console.log(`✓ Synced item to iPhone: ${item.text}`);
    } catch (error) {
      console.error(`✗ Failed to sync item ${itemId}:`, error.message);
      throw error;
    }
  }

  async getItemById(itemId) {
    return new Promise((resolve, reject) => {
      this.db.db.get(
        `SELECT * FROM shopping_list_items WHERE id = ?`,
        [itemId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Delete an item from both database and iCloud
   */
  async deleteSingleItem(itemId) {
    try {
      const item = await this.getItemById(itemId);
      if (!item) {
        return;
      }

      if (item.icloudId) {
        // Delete from iCloud
        await this.caldavService.deleteReminder(this.listName, item.icloudId);
      }

      // Delete from database
      await this.deleteItem(itemId);
      console.log(`✓ Deleted item from both app and iPhone: ${item.text}`);
    } catch (error) {
      console.error(`✗ Failed to delete item ${itemId}:`, error.message);
      throw error;
    }
  }
}

module.exports = ReminderSyncService;
