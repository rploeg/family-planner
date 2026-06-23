function getApiBaseUrl() {
  const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin, port, protocol } = window.location;

    if (port === '3000') {
      return `${protocol}//${hostname}:3002`;
    }

    return origin;
  }

  return 'http://localhost:3002';
}

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ============= FAMILY MEMBERS API =============
  async getFamilyMembers() {
    return this.request('/api/family-members');
  }

  async addFamilyMember(member) {
    return this.request('/api/family-members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  }

  async updateFamilyMember(id, updates) {
    return this.request(`/api/family-members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFamilyMember(id) {
    return this.request(`/api/family-members/${id}`, {
      method: 'DELETE',
    });
  }

  // ============= MEALS API =============
  async getMeals(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.date) queryParams.append('date', params.date);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    const query = queryParams.toString();
    return this.request(`/api/meals${query ? `?${query}` : ''}`);
  }

  async addMeal(meal) {
    return this.request('/api/meals', {
      method: 'POST',
      body: JSON.stringify(meal),
    });
  }

  async updateMeal(id, updates) {
    return this.request(`/api/meals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteMeal(id) {
    return this.request(`/api/meals/${id}`, {
      method: 'DELETE',
    });
  }

  // ============= SHOPPING LISTS API =============
  async getLists() {
    return this.request('/api/lists');
  }

  async addList(list) {
    return this.request('/api/lists', {
      method: 'POST',
      body: JSON.stringify(list),
    });
  }

  async updateList(id, updates) {
    return this.request(`/api/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteList(id) {
    return this.request(`/api/lists/${id}`, {
      method: 'DELETE',
    });
  }

  async addListItem(listId, item) {
    return this.request(`/api/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateListItem(listId, itemId, updates) {
    return this.request(`/api/lists/${listId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteListItem(listId, itemId) {
    return this.request(`/api/lists/${listId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // ============= CALENDAR EVENTS API =============
  async getEvents(startDate, endDate) {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });
    return this.request(`/api/events?${queryParams.toString()}`);
  }

  // ============= TASKS WITH DUE DATES API =============
  async getTasksWithDueDate(startDate, endDate) {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const query = queryParams.toString();
    return this.request(`/api/tasks/due${query ? `?${query}` : ''}`);
  }

  // ============= WEATHER API =============
  async getWeather(lang = 'en') {
    return this.request(`/api/weather?lang=${lang}`);
  }

  // ============= SETTINGS API =============
  async getSettings() {
    return this.request('/api/settings');
  }

  async updateSetting(key, value) {
    return this.request(`/api/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // ============= LOXONE API =============
  async getLoxoneRooms() {
    return this.request('/api/loxone/rooms');
  }

  async getLoxoneStatus() {
    return this.request('/api/loxone/status');
  }

  async getLoxoneEnergy() {
    return this.request('/api/loxone/energy');
  }

  async getLoxoneSensors() {
    return this.request('/api/loxone/sensors');
  }

  async getLoxoneLights() {
    return this.request('/api/loxone/lights');
  }

  async toggleLoxoneLight(uuid, on) {
    return this.request(`/api/loxone/lights/${uuid}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ on }),
    });
  }

  async setLoxoneLightMood(uuid, mood) {
    return this.request(`/api/loxone/lights/${uuid}/mood`, {
      method: 'POST',
      body: JSON.stringify({ mood }),
    });
  }

  async playLoxoneAudio(uuid, sound = null) {
    return this.request(`/api/loxone/audio/${uuid}/play`, {
      method: 'POST',
      body: JSON.stringify({ sound }),
    });
  }

  // ============= RECIPES API =============
  async searchRecipes(query) {
    return this.request(`/api/recipes/search?q=${encodeURIComponent(query)}`);
  }

  async getRecipe(id) {
    return this.request(`/api/recipes/${id}`);
  }

  async getRecipeCategories() {
    return this.request('/api/recipes/categories');
  }

  async getRecipesByCategory(category) {
    return this.request(`/api/recipes/category/${encodeURIComponent(category)}`);
  }

  async getRandomRecipe() {
    return this.request('/api/recipes/random');
  }

  // ============= FAMILY OPERATIONS API =============
  async getRoutines(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request(`/api/routines${query}`);
  }

  async getRoutineProgress(date, childId) {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    if (childId) queryParams.append('childId', childId);
    const query = queryParams.toString();
    return this.request(`/api/routines/progress${query ? `?${query}` : ''}`);
  }

  async createRoutine(payload) {
    return this.request('/api/routines', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateRoutine(id, payload) {
    return this.request(`/api/routines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteRoutine(id) {
    return this.request(`/api/routines/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleRoutineStep(routineId, stepId, payload) {
    return this.request(`/api/routines/${routineId}/steps/${stepId}/toggle`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getHomework() {
    return this.request('/api/homework');
  }

  async getHomeworkAlerts(daysAhead = 3) {
    return this.request(`/api/homework/alerts?daysAhead=${daysAhead}`);
  }

  async createHomework(payload) {
    return this.request('/api/homework', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateHomework(id, payload) {
    return this.request(`/api/homework/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteHomework(id) {
    return this.request(`/api/homework/${id}`, {
      method: 'DELETE',
    });
  }

  async getChores() {
    return this.request('/api/chores');
  }

  async createChore(payload) {
    return this.request('/api/chores', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateChore(id, payload) {
    return this.request(`/api/chores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteChore(id) {
    return this.request(`/api/chores/${id}`, {
      method: 'DELETE',
    });
  }

  async completeChore(id, payload) {
    return this.request(`/api/chores/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTokenWallets() {
    return this.request('/api/tokens/wallets');
  }

  async getTokenTransactions(childId) {
    const query = childId ? `?childId=${encodeURIComponent(childId)}` : '';
    return this.request(`/api/tokens/transactions${query}`);
  }

  async adjustTokens(payload) {
    return this.request('/api/tokens/adjust', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getEmergencyCardStatus() {
    return this.request('/api/emergency-card/status');
  }

  async setEmergencyPin(payload) {
    return this.request('/api/emergency-card/pin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getEmergencyCard(pin) {
    return this.request(`/api/emergency-card?pin=${encodeURIComponent(pin)}`);
  }

  async updateEmergencyCard(payload) {
    return this.request('/api/emergency-card', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getFamilyMeetings() {
    return this.request('/api/family-meetings');
  }

  async createFamilyMeeting(payload) {
    return this.request('/api/family-meetings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateFamilyMeeting(id, payload) {
    return this.request(`/api/family-meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteFamilyMeeting(id) {
    return this.request(`/api/family-meetings/${id}`, {
      method: 'DELETE',
    });
  }

  async createFamilyMeetingAction(meetingId, payload) {
    return this.request(`/api/family-meetings/${meetingId}/actions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateFamilyMeetingAction(id, payload) {
    return this.request(`/api/family-meetings/actions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getCommandCenterSummary() {
    return this.request('/api/command-center/summary');
  }

  // ============= HEALTH CHECK =============
  async healthCheck() {
    return this.request('/health');
  }

  // ============= WEBSOCKET FOR REAL-TIME UPDATES =============
  connectWebSocket(callbacks = {}) {
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws';
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);
    this.wsCallbacks = callbacks;
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      if (callbacks.onConnect) callbacks.onConnect();
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data.type);
        
        if (data.type === 'loxone_state_update' && callbacks.onLoxoneUpdate) {
          callbacks.onLoxoneUpdate(data.updates);
        } else if (callbacks.onMessage) {
          callbacks.onMessage(data);
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (callbacks.onDisconnect) callbacks.onDisconnect();
      
      // Reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(callbacks), 5000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return this.ws;
  }
  
  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const apiService = new ApiService();
export default apiService;
