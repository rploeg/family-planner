const https = require('https');
const crypto = require('crypto');

class LoxoneService {
  constructor(config) {
    this.serverUrl = config.serverUrl;
    this.username = config.username;
    this.password = config.password;
    this.isInitialized = false;
    this.token = null;
    
    if (this.serverUrl && this.username && this.password) {
      this.initialize();
    }
  }

  async initialize() {
    try {
      console.log('Initializing Loxone connection...');
      // Test connection by fetching structure file
      const structure = await this.getStructureFile();
      if (structure) {
        this.isInitialized = true;
        console.log('✓ Loxone service ready');
      }
    } catch (error) {
      console.error('Failed to initialize Loxone:', error.message);
      this.isInitialized = false;
    }
  }

  // Make authenticated request to Loxone Miniserver
  async makeRequest(path) {
    if (!this.serverUrl || !this.username || !this.password) {
      throw new Error('Loxone credentials not configured');
    }

    return new Promise((resolve, reject) => {
      const url = new URL(path, this.serverUrl);
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`
        },
        rejectUnauthorized: false // Allow self-signed certificates
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Invalid JSON response from Loxone'));
          }
        });
      });

      req.on('error', (error) => reject(error));
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  // Get Loxone structure file (LoxApp3.json)
  async getStructureFile() {
    try {
      const response = await this.makeRequest('/data/LoxAPP3.json');
      return response;
    } catch (error) {
      console.error('Failed to get structure file:', error.message);
      return null;
    }
  }

  // Get all Intelligent Room Controllers with their current temperatures
  async getRoomTemperatures() {
    try {
      const structure = await this.getStructureFile();
      if (!structure || !structure.controls) {
        return [];
      }

      const rooms = [];
      
      // Find all Intelligent Room Controllers
      for (const [uuid, control] of Object.entries(structure.controls)) {
        if (control.type === 'IRoomControllerV2' || control.type === 'IntelligentRoomController') {
          rooms.push({
            uuid: uuid,
            name: control.name,
            room: control.room || control.cat || 'Unknown',
            actualTemp: control.states?.tempActual || null,
            targetTemp: control.states?.tempTarget || null,
            mode: control.states?.mode || 0,
            occupied: control.states?.occupied || false
          });
        }
      }

      return rooms;
    } catch (error) {
      console.error('Failed to get room temperatures:', error.message);
      return [];
    }
  }

  // Get room status from Room Status blocks
  async getRoomStatuses() {
    try {
      const structure = await this.getStructureFile();
      if (!structure || !structure.controls) {
        return [];
      }

      const statuses = [];
      
      // Find all Room Status blocks
      for (const [uuid, control] of Object.entries(structure.controls)) {
        if (control.type === 'Radio' && control.details?.outputs) {
          // Radio control with outputs is used for Room Status
          const activeOutput = control.states?.active || 0;
          const outputs = control.details.outputs;
          
          // Map output number to status name
          let statusName = 'Unknown';
          if (outputs[activeOutput]) {
            statusName = outputs[activeOutput];
          }

          statuses.push({
            uuid: uuid,
            name: control.name,
            room: control.room || control.cat || 'Unknown',
            status: statusName,
            activeOutput: activeOutput
          });
        }
      }

      return statuses;
    } catch (error) {
      console.error('Failed to get room statuses:', error.message);
      return [];
    }
  }

  // Get combined room information (temperatures + statuses)
  async getRoomsInfo() {
    try {
      const [temperatures, statuses] = await Promise.all([
        this.getRoomTemperatures(),
        this.getRoomStatuses()
      ]);

      // Merge data by room name
      const roomsMap = new Map();

      temperatures.forEach(temp => {
        const key = temp.room || temp.name;
        roomsMap.set(key, {
          name: temp.name,
          room: temp.room,
          actualTemp: temp.actualTemp,
          targetTemp: temp.targetTemp,
          mode: temp.mode,
          occupied: temp.occupied,
          uuid: temp.uuid
        });
      });

      statuses.forEach(status => {
        const key = status.room || status.name;
        const existing = roomsMap.get(key) || {};
        roomsMap.set(key, {
          ...existing,
          status: status.status,
          statusUuid: status.uuid
        });
      });

      return Array.from(roomsMap.values());
    } catch (error) {
      console.error('Failed to get rooms info:', error.message);
      return [];
    }
  }

  // Generate suggestions based on room data and calendar events
  generateSuggestions(rooms, upcomingEvents) {
    const suggestions = [];
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

    // Check for upcoming events that might need room preparation
    upcomingEvents.forEach(event => {
      const eventStart = new Date(event.start);
      const eventLocation = event.location?.toLowerCase() || '';
      
      // Find matching room
      const matchingRoom = rooms.find(room => 
        eventLocation.includes(room.name.toLowerCase()) ||
        eventLocation.includes(room.room?.toLowerCase())
      );

      if (matchingRoom && eventStart > now && eventStart < nextHour) {
        const timeTilEvent = Math.round((eventStart - now) / 60000); // minutes
        
        // Temperature suggestion
        if (matchingRoom.actualTemp && matchingRoom.targetTemp) {
          const tempDiff = matchingRoom.actualTemp - matchingRoom.targetTemp;
          if (Math.abs(tempDiff) > 2) {
            suggestions.push({
              type: 'temperature',
              room: matchingRoom.name,
              message: `${matchingRoom.name} is ${matchingRoom.actualTemp}°C (target: ${matchingRoom.targetTemp}°C). Event "${event.title}" starts in ${timeTilEvent} minutes.`,
              priority: tempDiff < -2 ? 'high' : 'medium',
              action: tempDiff < 0 ? 'warm up' : 'cool down',
              event: event.title
            });
          }
        }

        // Status suggestion
        if (matchingRoom.status === 'Do Not Disturb') {
          suggestions.push({
            type: 'status',
            room: matchingRoom.name,
            message: `${matchingRoom.name} is set to "Do Not Disturb" but "${event.title}" starts in ${timeTilEvent} minutes.`,
            priority: 'medium',
            action: 'update status'
          });
        }
      }
    });

    // Check for cold rooms in morning
    const hour = now.getHours();
    if (hour >= 5 && hour < 9) {
      rooms.forEach(room => {
        if (room.actualTemp && room.actualTemp < 18 && room.name.toLowerCase().includes('office')) {
          suggestions.push({
            type: 'temperature',
            room: room.name,
            message: `${room.name} is ${room.actualTemp}°C. Warm up before work?`,
            priority: 'low',
            action: 'warm up'
          });
        }
      });
    }

    return suggestions;
  }
}

module.exports = LoxoneService;
