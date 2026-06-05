const https = require('https');
const crypto = require('crypto');
const WebSocket = require('ws');
const axios = require('axios');

class LoxoneService {
  constructor(config) {
    this.serverUrl = config.serverUrl;
    this.username = config.username;
    this.password = config.password;
    this.isInitialized = false;
    this.token = null;
    this.stateValues = new Map(); // Cache for real-time state values
    this.ws = null;
    this.wsConnected = false;
    this.wsReconnectTimer = null;
    this.keepAliveTimer = null;
    this.structureFile = null; // Cache structure file
    this.stateUpdateCallbacks = []; // Callbacks for state updates
    
    if (this.serverUrl && this.username && this.password) {
      this.initialize();
    }
  }

  // Register a callback for state updates
  onStateUpdate(callback) {
    this.stateUpdateCallbacks.push(callback);
  }

  // Notify all callbacks of state updates
  notifyStateUpdate(updates) {
    for (const callback of this.stateUpdateCallbacks) {
      try {
        callback(updates);
      } catch (error) {
        console.error('State update callback error:', error.message);
      }
    }
  }

  async initialize() {
    // Prevent multiple initializations
    if (this.isInitialized) {
      return;
    }
    
    try {
      console.log('Initializing Loxone connection...');
      // Test connection by fetching structure file
      const structure = await this.getStructureFile();
      if (structure) {
        this.structureFile = structure;
        this.isInitialized = true;
        console.log('✓ Loxone service ready');
        // Connect WebSocket for real-time state updates
        this.connectWebSocket();
        // Start polling for state changes (fallback for when WebSocket isn't providing updates)
        this.startPolling(5000);
      }
    } catch (error) {
      console.error('Failed to initialize Loxone:', error.message);
      this.isInitialized = false;
    }
  }

  // Connect to Loxone WebSocket for real-time state updates
  connectWebSocket() {
    try {
      // Clear any existing timers
      if (this.wsReconnectTimer) {
        clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = null;
      }
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
      
      const url = new URL(this.serverUrl);
      // Use credentials in the WebSocket URL for authentication
      const wsUrl = `wss://${encodeURIComponent(this.username)}:${encodeURIComponent(this.password)}@${url.hostname}:${url.port || 443}/ws/rfc6455`;
      
      console.log('Connecting to Loxone WebSocket...');
      
      this.ws = new WebSocket(wsUrl, {
        rejectUnauthorized: false
      });
      
      this.ws.on('open', () => {
        console.log('✓ Loxone WebSocket connected');
        this.wsConnected = true;
        
        // Try to enable binary status updates (may not work on all Miniserver versions)
        // Use the full jdev path
        this.ws.send('jdev/sps/enablebinstatusupdate');
        
        // Start keep-alive timer to prevent connection timeout
        this.keepAliveTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('keepalive');
          }
        }, 60000);
      });
      
      this.ws.on('message', (data) => {
        this.handleWebSocketMessage(data);
      });
      
      this.ws.on('close', (code, reason) => {
        const reasonStr = reason ? reason.toString() : 'no reason';
        console.log(`Loxone WebSocket disconnected (code: ${code}, reason: ${reasonStr})`);
        this.wsConnected = false;
        if (this.keepAliveTimer) {
          clearInterval(this.keepAliveTimer);
          this.keepAliveTimer = null;
        }
        // Reconnect after 5 seconds
        this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 5000);
      });
      
      this.ws.on('error', (error) => {
        console.error('Loxone WebSocket error:', error.message);
        this.wsConnected = false;
      });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error.message);
    }
  }

  // Handle incoming WebSocket messages
  handleWebSocketMessage(data) {
    try {
      // Loxone sends both binary and text messages
      if (Buffer.isBuffer(data)) {
        // Binary message with Loxone header
        // Header format (8 bytes):
        //   Byte 0: Fixed 0x03
        //   Byte 1: Message type identifier
        //   Byte 2: Message info/flags  
        //   Byte 3: Reserved (0x00)
        //   Bytes 4-7: Payload length (little-endian uint32)
        
        if (data.length < 8) return;
        
        const headerByte = data[0];       // Should be 0x03
        const msgType = data[1];          // Message type
        const msgInfo = data[2];          // Info flags
        const payloadLen = data.readUInt32LE(4);
        
        // Check if this looks like a JSON text message (starts with '{')
        if (headerByte === 0x7b) {
          // It's actually a text/JSON message
          const text = data.toString('utf8');
          this.handleTextMessage(text);
          return;
        }
        
        // Skip if not a valid Loxone header
        if (headerByte !== 0x03) {
          console.log(`WS: Unknown header byte 0x${headerByte.toString(16)}, length ${data.length}`);
          return;
        }
        
        const payload = data.slice(8);
        
        // Message types:
        // 0 = Text message
        // 1 = Binary file
        // 2 = Value states (uuid + double)
        // 3 = Text states
        // 4 = DayTimer states
        // 5 = Out of service
        // 6 = Keep alive
        // 7 = Weather states
        
        if (msgType === 0) {
          // Text message (response to commands)
          this.handleTextMessage(payload.toString('utf8'));
        } else if (msgType === 2) {
          // Value states update
          this.parseValueStates(payload);
        } else if (msgType === 3) {
          // Text states update
          this.parseTextStates(payload);
        } else if (msgType === 6) {
          // Keep-alive response - send back keepalive
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('keepalive');
          }
        }
      } else {
        // Plain text message
        const text = data.toString();
        this.handleTextMessage(text);
      }
    } catch (error) {
      console.error('WS message parse error:', error.message);
    }
  }

  // Handle text/JSON messages from Loxone
  handleTextMessage(text) {
    try {
      const msg = JSON.parse(text);
      if (msg.LL) {
        const code = msg.LL.Code || msg.LL.code;
        const control = msg.LL.control || '';
        
        // Handle authentication flow
        if (control.includes('authenticate') && !this.wsAuthenticated) {
          if (code === '200' || code === 200) {
            // Authentication step 1 successful - we got a challenge/key
            const key = msg.LL.value?.key;
            if (key) {
              // Use HMAC-SHA1 authentication with the key
              console.log('WS: Got auth key, computing response...');
              const hmac = crypto.createHmac('sha1', key);
              hmac.update(`${this.username}:${this.password}`);
              const hash = hmac.digest('hex');
              this.ws.send(`authenticate/${hash}`);
            } else {
              // Simple authentication (if value is just a token or success)
              console.log('✓ WS authenticated (simple auth)');
              this.wsAuthenticated = true;
              this.onWsAuthenticated();
            }
          } else if (code === '401' || code === 401) {
            console.error('WS authentication failed:', msg.LL.value);
          }
        } else if (control.includes('authenticateHash') || 
                   (control.includes('authenticate') && this.wsAuthenticated === false && (code === '200' || code === 200))) {
          // Second step of authentication completed
          console.log('✓ WS authenticated');
          this.wsAuthenticated = true;
          this.onWsAuthenticated();
        } else if (control === 'jdev/sps/enablebinstatusupdate' && (code === '200' || code === 200)) {
          console.log('✓ Binary status updates enabled');
        }
      }
    } catch (e) {
      // Ignore non-JSON messages
    }
  }

  // Called when WebSocket authentication is successful
  onWsAuthenticated() {
    // Request status updates (enable binary status updates)
    this.ws.send('jdev/sps/enablebinstatusupdate');
    
    // Start keep-alive timer (send keepalive every 60 seconds to prevent timeout)
    this.keepAliveTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('keepalive');
      }
    }, 60000);
  }

  // Parse Loxone value state updates (message type 2)
  parseValueStates(buffer) {
    try {
      // Value states format:
      // Each entry is 24 bytes:
      //   16 bytes: UUID (4 x uint32 little-endian)
      //   8 bytes: Double value (little-endian)
      
      let offset = 0;
      const updates = [];
      
      while (offset + 24 <= buffer.length) {
        // Read UUID
        const uuid = this.readUuidFromBuffer(buffer, offset);
        offset += 16;
        
        // Read value
        const value = buffer.readDoubleLE(offset);
        offset += 8;
        
        // Check if value changed
        const oldValue = this.stateValues.get(uuid);
        if (oldValue !== value) {
          updates.push({ uuid, value, oldValue });
        }
        
        // Store in cache
        this.stateValues.set(uuid, value);
      }
      
      if (updates.length > 0) {
        console.log(`WS: Updated ${updates.length} state values (total cached: ${this.stateValues.size})`);
        // Notify callbacks of state changes
        this.notifyStateUpdate(updates);
      }
    } catch (error) {
      console.error('Value states parse error:', error.message);
    }
  }

  // Parse Loxone text state updates (message type 3)
  parseTextStates(buffer) {
    try {
      // Text states format:
      // 16 bytes: UUID
      // 4 bytes: Icon UUID (or 0)
      // 4 bytes: Text length
      // N bytes: Text (UTF-8)
      
      let offset = 0;
      
      while (offset + 24 <= buffer.length) {
        const uuid = this.readUuidFromBuffer(buffer, offset);
        offset += 16;
        
        // Skip icon UUID
        offset += 4;
        
        // Read text length
        const textLen = buffer.readUInt32LE(offset);
        offset += 4;
        
        if (offset + textLen > buffer.length) break;
        
        const text = buffer.slice(offset, offset + textLen).toString('utf8');
        offset += textLen;
        
        // Align to 4-byte boundary
        const padding = (4 - (textLen % 4)) % 4;
        offset += padding;
        
        // Store text value in cache
        this.stateValues.set(uuid, text);
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  // Read UUID from buffer in Loxone format
  readUuidFromBuffer(buffer, offset) {
    const p1 = buffer.readUInt32LE(offset).toString(16).padStart(8, '0');
    const p2 = buffer.readUInt32LE(offset + 4).toString(16).padStart(8, '0');
    const p3 = buffer.readUInt32LE(offset + 8).toString(16).padStart(8, '0');
    const p4 = buffer.readUInt32LE(offset + 12).toString(16).padStart(8, '0');
    
    // Reconstruct UUID in Loxone format: xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx
    return `${p1.slice(0, 8)}-${p2.slice(0, 4)}-${p2.slice(4, 8)}-${p3}${p4}`;
  }

  // Get cached state value from WebSocket updates
  getCachedStateValue(stateUuid) {
    return this.stateValues.get(stateUuid) ?? null;
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
      if (response && response.LL && response.LL.value !== undefined) {
        // Loxone can return Code as string "200" or number 200
        const code = response.LL.Code || response.LL.code;
        if (code === '200' || code === 200) {
          const val = response.LL.value;
          // Value might be a string like "hsv(0,0,0)" or a number
          if (typeof val === 'string' && !isNaN(parseFloat(val))) {
            return parseFloat(val);
          }
          return val;  // Return as-is for string values like "hsv(...)"
        }
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
          // Get room name from structure
          const roomUuid = control.room;
          const roomName = structure.rooms && structure.rooms[roomUuid] 
            ? structure.rooms[roomUuid].name 
            : 'Unknown';
          
          // Get activeMoods state UUID from the control structure
          const activeMoodsStateUuid = control.states?.activeMoods;
          
          // Query the actual state from Loxone
          let activeMood = null;
          if (activeMoodsStateUuid) {
            // First try to get the cached value (if WebSocket is working)
            activeMood = this.getCachedStateValue(activeMoodsStateUuid);
            
            // If no cached value or WebSocket is disconnected, query REST API using the state UUID directly
            if (activeMood === null || !this.wsConnected) {
              // Query the state UUID directly, not the control UUID with a suffix
              activeMood = await this.getStateValue(activeMoodsStateUuid, '');
            }
          }
          
          const isOn = activeMood !== null && activeMood > 0;
          
          lights.push({
            uuid: uuid,
            name: control.name,
            room: roomName,
            isOn: isOn,
            brightness: isOn ? 100 : 0,
            activeMood: activeMood || 0,
            wsConnected: this.wsConnected // Debug info
          });
        }
      }
      
      return lights;
    } catch (error) {
      console.error('Failed to get lights:', error.message);
      return [];
    }
  }

  // Toggle a light on/off
  async toggleLight(uuid, on) {
    try {
      // For LightControllerV2, we use plus/minus to switch moods
      // or we can use the changeTo command with a mood value
      const command = on ? 'plus' : 'Off';
      const url = `${this.serverUrl}/jdev/sps/io/${uuid}/${command}`;
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      
      console.log(`[Loxone] Toggle light ${uuid} -> ${on ? 'ON' : 'OFF'}`);
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'Authorization': `Basic ${auth}`
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      
      // Force an immediate state refresh after toggle by querying the structure
      const structure = await this.getStructureFile();
      const control = structure?.controls?.[uuid];
      const activeMoodsStateUuid = control?.states?.activeMoods;
      
      if (activeMoodsStateUuid) {
        // Wait a brief moment for Loxone to process the command
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Query the new state value
        const newState = await this.getStateValue(activeMoodsStateUuid, '');
        
        // Update cache immediately
        if (newState !== null) {
          this.stateValues.set(activeMoodsStateUuid, newState);
          console.log(`[Loxone] Light ${uuid} state updated: activeMood=${newState}`);
        }
      }
      
      return {
        success: true,
        command,
        response: response.data
      };
    } catch (error) {
      console.error(`[Loxone] Failed to toggle light ${uuid}:`, error.message);
      throw error;
    }
  }

  // Set a specific mood on a light controller
  async setLightMood(uuid, mood) {
    try {
      // changeTo command sets a specific mood
      const url = `${this.serverUrl}/jdev/sps/io/${uuid}/changeTo/${mood}`;
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      
      console.log(`[Loxone] Set light ${uuid} mood -> ${mood}`);
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'Authorization': `Basic ${auth}`
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      
      // Notify state change immediately
      this.notifyStateUpdate(`light:${uuid}`, { mood });
      
      return {
        success: true,
        mood,
        response: response.data
      };
    } catch (error) {
      console.error(`[Loxone] Failed to set mood for light ${uuid}:`, error.message);
      throw error;
    }
  }

  // Play audio/bell sound on an audio zone
  async playAudio(uuid, sound = null) {
    try {
      // Use 'Alarm' command which is typically louder and more noticeable
      // If sound number is provided, use Alarm/<number>, otherwise just Alarm for default
      const command = sound ? `Alarm/${sound}` : 'Alarm';
      const url = `${this.serverUrl}/jdev/sps/io/${uuid}/${command}`;
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      
      console.log(`[Loxone] Play audio on ${uuid} -> ${command}`);
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'Authorization': `Basic ${auth}`
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      
      return {
        success: true,
        command,
        response: response.data
      };
    } catch (error) {
      console.error(`[Loxone] Failed to play audio on ${uuid}:`, error.message);
      throw error;
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

  // Debug: Get all control types from structure
  async getControlTypes() {
    try {
      const structure = await this.getStructureFile();
      if (!structure || !structure.controls) {
        return { error: 'No structure found' };
      }

      const types = {};
      
      for (const [uuid, control] of Object.entries(structure.controls)) {
        const type = control.type || 'unknown';
        if (!types[type]) {
          types[type] = [];
        }
        
        // Get room name
        const roomUuid = control.room;
        const roomName = structure.rooms && structure.rooms[roomUuid] 
          ? structure.rooms[roomUuid].name 
          : 'Unknown';
        
        types[type].push({
          uuid: uuid,
          name: control.name,
          room: roomName,
          states: control.states ? Object.keys(control.states) : [],
          subControls: control.subControls ? Object.keys(control.subControls).length : 0
        });
      }
      
      return types;
    } catch (error) {
      console.error('Failed to get control types:', error.message);
      return { error: error.message };
    }
  }

  // Debug: Get detailed info about a specific control
  async getControlDetails(uuid) {
    try {
      const structure = await this.getStructureFile();
      if (!structure || !structure.controls || !structure.controls[uuid]) {
        return null;
      }

      const control = structure.controls[uuid];
      
      // Get room name
      const roomUuid = control.room;
      const roomName = structure.rooms && structure.rooms[roomUuid] 
        ? structure.rooms[roomUuid].name 
        : 'Unknown';
      
      return {
        uuid: uuid,
        name: control.name,
        type: control.type,
        room: roomName,
        states: control.states,
        subControls: control.subControls,
        details: control.details
      };
    } catch (error) {
      console.error('Failed to get control details:', error.message);
      return null;
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

  // Poll for state changes and notify callbacks
  // This is used when WebSocket binary updates are not available
  async pollStates() {
    if (!this.isInitialized) return;
    
    try {
      // Get current light states
      const lights = await this.getLights();
      const sensors = await this.getInfoSensors();
      
      // Check for changes and notify
      const updates = [];
      
      // Get structure to access state UUIDs
      const structure = await this.getStructureFile();
      
      for (const light of lights) {
        // Use the activeMoods state UUID as the cache key, not the control UUID
        const control = structure?.controls?.[light.uuid];
        const activeMoodsStateUuid = control?.states?.activeMoods;
        
        if (activeMoodsStateUuid) {
          const oldValue = this.stateValues.get(activeMoodsStateUuid);
          const newValue = light.activeMood;
          
          if (oldValue !== newValue) {
            updates.push({
              type: 'light',
              uuid: light.uuid,
              name: light.name,
              room: light.room,
              oldValue,
              value: newValue,
              isOn: light.isOn
            });
          }
          // Store using the state UUID so getLights() can find it
          this.stateValues.set(activeMoodsStateUuid, newValue);
        }
      }
      
      for (const sensor of sensors) {
        const stateKey = `sensor:${sensor.uuid}`;
        const oldValue = this.stateValues.get(stateKey);
        const newValue = sensor.value;
        
        // Only notify if value changed significantly (for analog sensors)
        if (oldValue !== undefined && Math.abs(oldValue - newValue) > 0.1) {
          updates.push({
            type: 'sensor',
            uuid: sensor.uuid,
            name: sensor.name,
            room: sensor.room,
            sensorType: sensor.type,
            oldValue,
            value: newValue
          });
        }
        this.stateValues.set(stateKey, newValue);
      }
      
      if (updates.length > 0) {
        console.log(`Loxone: ${updates.length} state changes detected`);
        this.notifyStateUpdate(updates);
      }
      
      return updates;
    } catch (error) {
      console.error('Poll states error:', error.message);
      return [];
    }
  }

  // Start polling for state changes
  startPolling(intervalMs = 5000) {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    
    console.log(`Starting Loxone state polling (every ${intervalMs / 1000}s)`);
    this.pollingTimer = setInterval(() => this.pollStates(), intervalMs);
    
    // Initial poll
    this.pollStates();
  }

  // Stop polling
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  // Debug method to test raw queries to Loxone
  async debugQuery(path) {
    try {
      const response = await this.makeRequest(path);
      return response;
    } catch (error) {
      return { error: error.message };
    }
  }
}

module.exports = LoxoneService;
