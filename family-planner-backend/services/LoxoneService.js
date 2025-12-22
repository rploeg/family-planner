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

  // Get a single state value by control UUID and state name
  async getStateValue(controlUuid, stateName) {
    try {
      // Build path - if stateName is empty, just use the control UUID
      const path = stateName ? `/jdev/sps/io/${controlUuid}/${stateName}` : `/jdev/sps/io/${controlUuid}`;
      const response = await this.makeRequest(path);
      if (response && response.LL && response.LL.value !== undefined && response.LL.Code === '200') {
        return parseFloat(response.LL.value);
      }
      return null;
    } catch (error) {
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
          // Room controllers expose their main state as the primary value
          // Individual sensors may need to be queried via their state UUIDs
          const mainValue = await this.getStateValue(uuid, '');
          
          // Get room name from structure
          const roomUuid = control.room;
          const roomName = structure.rooms && structure.rooms[roomUuid] 
            ? structure.rooms[roomUuid].name 
            : 'Unknown';
          
          // Check for presence detector in the same room
          let isOccupied = false;
          for (const [presenceUuid, presenceControl] of Object.entries(structure.controls)) {
            if (presenceControl.type === 'PresenceDetector' && presenceControl.room === roomUuid) {
              const presenceValue = await this.getStateValue(presenceUuid, 'active');
              isOccupied = presenceValue === 1;
              break;
            }
          }
          
          rooms.push({
            uuid: uuid,
            name: control.name,
            room: roomName,
            mode: mainValue,
            // These values need to be fetched via subcontrols or state UUIDs
            actualTemp: null,
            targetTemp: null,
            humidity: null,
            co2: null,
            occupied: isOccupied
          });
        }
      }

      return rooms;
    } catch (error) {
      console.error('Failed to get room temperatures:', error.message);
      return [];
    }
  }

  // Get energy meter data
  async getEnergyData() {
    try {
      const structure = await this.getStructureFile();
      if (!structure || !structure.controls) {
        return null;
      }

      // Find P1 meter
      for (const [uuid, control] of Object.entries(structure.controls)) {
        if (control.type === 'Meter') {
          // For meters, query the control UUID directly to get current usage
          // Other stats need the full state names
          const [currentUsage, totalDay, totalWeek, totalMonth, totalYear, returnDay] = await Promise.all([
            this.getStateValue(uuid, ''),  // Empty string for main value
            this.getStateValue(uuid, 'totalday'),
            this.getStateValue(uuid, 'totalweek'),
            this.getStateValue(uuid, 'totalmonth'),
            this.getStateValue(uuid, 'totalyear'),
            this.getStateValue(uuid, 'totalnegday')
          ]);
          
          return {
            uuid: uuid,
            name: control.name,
            currentUsage: currentUsage || 0,
            totalDay: totalDay || 0,
            totalWeek: totalWeek || 0,
            totalMonth: totalMonth || 0,
            totalYear: totalYear || 0,
            returnDay: returnDay || 0
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get energy data:', error.message);
      return null;
    }
  }

  // Get analog sensor values (temperature, humidity, etc.)
  async getInfoSensors() {
    try {
      const structure = await this.getStructureFile();
      if (!structure || !structure.controls) {
        return [];
      }

      const sensors = [];
      
      for (const [uuid, control] of Object.entries(structure.controls)) {
        if (control.type === 'InfoOnlyAnalog') {
          // InfoOnlyAnalog controls return their value directly when queried without a state name
          const value = await this.getStateValue(uuid, '');
          
          // Get room name from structure
          const roomUuid = control.room;
          const roomName = structure.rooms && structure.rooms[roomUuid] 
            ? structure.rooms[roomUuid].name 
            : 'Unknown';
          
          // Detect sensor type based on name
          const lowerName = control.name.toLowerCase();
          let sensorType = 'unknown';
          if (lowerName.includes('temp')) {
            sensorType = 'temperature';
          } else if (lowerName.includes('humid')) {
            sensorType = 'humidity';
          } else if (lowerName.includes('co2')) {
            sensorType = 'co2';
          } else if (lowerName.includes('light')) {
            sensorType = 'light';
          }
          
          sensors.push({
            uuid: uuid,
            name: control.name,
            room: roomName,
            type: sensorType,
            value: value || 0
          });
        }
      }
      
      return sensors;
    } catch (error) {
      console.error('Failed to get info sensors:', error.message);
      return [];
    }
  }

  // Get light controllers
  async getLights() {
    try {
      const structure = await this.getStructureFile();
      if (!structure || !structure.controls) {
        return [];
      }

      const lights = [];
      
      for (const [uuid, control] of Object.entries(structure.controls)) {
        if (control.type === 'LightControllerV2') {
          // Get active mood (0 = off, >0 = on)
          const activeMood = await this.getStateValue(uuid, 'activeMoods');
          
          // Get room name from structure
          const roomUuid = control.room;
          const roomName = structure.rooms && structure.rooms[roomUuid] 
            ? structure.rooms[roomUuid].name 
            : 'Unknown';
          
          lights.push({
            uuid: uuid,
            name: control.name,
            room: roomName,
            isOn: activeMood > 0,
            activeMood: activeMood || 0
          });
        }
      }
      
      return lights;
    } catch (error) {
      console.error('Failed to get lights:', error.message);
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
