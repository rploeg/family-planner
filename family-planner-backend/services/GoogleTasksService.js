const { google } = require('googleapis');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class GoogleTasksService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.tasksApi = null;
    this.isInitialized = false;
    this.taskListId = null;
    this.taskListName = config.taskListName || 'Shopping List';
    this.tokenPath = path.join(__dirname, '..', 'data', 'google-tokens.json');
    
    // Create OAuth2 client immediately so getAuthUrl() works before initialize()
    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri || 'http://localhost:3002/api/google/callback'
    );
  }

  /**
   * Initialize the Google Tasks service with OAuth2
   */
  async initialize() {
    try {

      // Try to load saved tokens
      if (await this.loadSavedTokens()) {
        await this.setupTasksApi();
        await this.findOrCreateTaskList();
        this.isInitialized = true;
        console.log('✓ Google Tasks service ready');
        return true;
      }

      console.log('⚠ Google Tasks: Authorization required');
      console.log(`  Visit: ${this.getAuthUrl()}`);
      return false;
    } catch (error) {
      console.error('✗ Google Tasks initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/tasks'];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Handle OAuth2 callback and save tokens
   */
  async handleAuthCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Save tokens for future use
      await this.saveTokens(tokens);
      
      await this.setupTasksApi();
      await this.findOrCreateTaskList();
      this.isInitialized = true;
      
      console.log('✓ Google Tasks authenticated successfully');
      return true;
    } catch (error) {
      console.error('✗ Google auth callback failed:', error.message);
      throw error;
    }
  }

  /**
   * Load saved tokens from file
   */
  async loadSavedTokens() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        
        // Refresh token if expired
        if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          await this.saveTokens(credentials);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading Google tokens:', error.message);
      return false;
    }
  }

  /**
   * Save tokens to file
   */
  async saveTokens(tokens) {
    try {
      const dir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
    } catch (error) {
      console.error('Error saving Google tokens:', error.message);
    }
  }

  /**
   * Setup the Tasks API client
   */
  async setupTasksApi() {
    this.tasksApi = google.tasks({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Find or create the task list for shopping
   */
  async findOrCreateTaskList() {
    try {
      const response = await this.tasksApi.tasklists.list();
      const taskLists = response.data.items || [];
      
      // Find existing task list
      let taskList = taskLists.find(
        list => list.title.toLowerCase() === this.taskListName.toLowerCase()
      );
      
      if (!taskList) {
        // Create new task list
        const createResponse = await this.tasksApi.tasklists.insert({
          requestBody: {
            title: this.taskListName
          }
        });
        taskList = createResponse.data;
        console.log(`  Created Google Tasks list: ${this.taskListName}`);
      } else {
        console.log(`  Found Google Tasks list: ${taskList.title}`);
      }
      
      this.taskListId = taskList.id;
      return taskList;
    } catch (error) {
      console.error('Error finding/creating task list:', error.message);
      throw error;
    }
  }

  /**
   * Get all tasks from the shopping list
   */
  async getTasks() {
    if (!this.isInitialized) {
      throw new Error('Google Tasks service not initialized');
    }

    try {
      const response = await this.tasksApi.tasks.list({
        tasklist: this.taskListId,
        showCompleted: true,
        showHidden: true
      });
      
      const tasks = response.data.items || [];
      
      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        notes: task.notes || '',
        completed: task.status === 'completed',
        completedAt: task.completed || null,
        dueDate: task.due || null,
        updatedAt: task.updated,
        googleTaskId: task.id
      }));
    } catch (error) {
      console.error('Error fetching Google Tasks:', error.message);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    if (!this.isInitialized) {
      throw new Error('Google Tasks service not initialized');
    }

    try {
      const response = await this.tasksApi.tasks.insert({
        tasklist: this.taskListId,
        requestBody: {
          title: taskData.title || taskData.name,
          notes: taskData.notes || taskData.category || '',
          status: taskData.completed ? 'completed' : 'needsAction'
        }
      });
      
      console.log(`  ✓ Created Google Task: ${taskData.title || taskData.name}`);
      return response.data.id;
    } catch (error) {
      console.error('Error creating Google Task:', error.message);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId, taskData) {
    if (!this.isInitialized) {
      throw new Error('Google Tasks service not initialized');
    }

    try {
      const updateData = {
        title: taskData.title || taskData.name
      };
      
      if (taskData.notes !== undefined) {
        updateData.notes = taskData.notes;
      }
      
      if (taskData.completed !== undefined) {
        updateData.status = taskData.completed ? 'completed' : 'needsAction';
        if (taskData.completed) {
          updateData.completed = new Date().toISOString();
        }
      }
      
      const response = await this.tasksApi.tasks.patch({
        tasklist: this.taskListId,
        task: taskId,
        requestBody: updateData
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating Google Task:', error.message);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    if (!this.isInitialized) {
      throw new Error('Google Tasks service not initialized');
    }

    try {
      await this.tasksApi.tasks.delete({
        tasklist: this.taskListId,
        task: taskId
      });
      
      console.log(`  ✓ Deleted Google Task: ${taskId}`);
      return true;
    } catch (error) {
      console.error('Error deleting Google Task:', error.message);
      throw error;
    }
  }

  /**
   * Mark a task as completed
   */
  async completeTask(taskId) {
    return this.updateTask(taskId, { completed: true });
  }

  /**
   * Mark a task as not completed
   */
  async uncompleteTask(taskId) {
    return this.updateTask(taskId, { completed: false });
  }

  /**
   * Clear all completed tasks from the list
   */
  async clearCompleted() {
    if (!this.isInitialized) {
      throw new Error('Google Tasks service not initialized');
    }

    try {
      await this.tasksApi.tasks.clear({
        tasklist: this.taskListId
      });
      
      console.log('  ✓ Cleared completed Google Tasks');
      return true;
    } catch (error) {
      console.error('Error clearing completed tasks:', error.message);
      throw error;
    }
  }

  /**
   * Perform bidirectional sync between local database and Google Tasks
   */
  async performSync(dbItems) {
    if (!this.isInitialized) {
      return { status: 'not_initialized', message: 'Google Tasks not authorized' };
    }

    const syncResult = {
      status: 'success',
      timestamp: new Date().toISOString(),
      created: 0,
      updated: 0,
      deleted: 0,
      pulled: 0,
      syncedItems: {} // Maps local item ID to Google Task ID
    };

    try {
      console.log('\n🔄 Starting Google Tasks sync...');

      // Get tasks from Google
      const googleTasks = await this.getTasks();
      
      // Create maps for easy lookup
      const googleMap = new Map(googleTasks.map(t => [t.id, t]));
      const dbByGoogleId = new Map(
        dbItems.filter(i => i.googleTaskId).map(i => [i.googleTaskId, i])
      );

      // Sync from Google to Database (Google → App)
      for (const googleTask of googleTasks) {
        const dbItem = dbByGoogleId.get(googleTask.id);

        if (!dbItem) {
          // New task from Google - will be created in database by caller
          syncResult.pulled++;
          this.emit('newTaskFromGoogle', googleTask);
        }
      }

      // Sync from Database to Google (App → Google)
      for (const dbItem of dbItems) {
        if (!dbItem.googleTaskId) {
          // New item from app - create in Google
          const googleId = await this.createTask(dbItem);
          syncResult.syncedItems[dbItem.id] = googleId; // Track the mapping
          this.emit('taskCreatedInGoogle', { dbItem, googleId });
          syncResult.created++;
        } else if (!googleMap.has(dbItem.googleTaskId)) {
          // Task was deleted from Google - notify caller
          this.emit('taskDeletedFromGoogle', dbItem);
          syncResult.deleted++;
        } else {
          // Task exists in both - check for updates
          const googleTask = googleMap.get(dbItem.googleTaskId);
          
          // Check if local item needs to sync to Google
          if (dbItem.checked !== googleTask.completed) {
            await this.updateTask(dbItem.googleTaskId, {
              title: dbItem.name,
              completed: dbItem.checked
            });
            syncResult.updated++;
          }
        }
      }

      console.log(`✓ Google Tasks sync complete: ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.deleted} deleted, ${syncResult.pulled} pulled`);
      
      this.emit('syncComplete', syncResult);
      return syncResult;

    } catch (error) {
      console.error('✗ Google Tasks sync failed:', error.message);
      syncResult.status = 'error';
      syncResult.error = error.message;
      return syncResult;
    }
  }

  /**
   * Get the list of all task lists
   */
  async getTaskLists() {
    if (!this.isInitialized) {
      throw new Error('Google Tasks service not initialized');
    }

    try {
      const response = await this.tasksApi.tasklists.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching task lists:', error.message);
      throw error;
    }
  }
}

module.exports = GoogleTasksService;
