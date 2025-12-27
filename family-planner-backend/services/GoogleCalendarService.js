const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleCalendarService {
  constructor(config) {
    this.config = config;
    this.oauth2Client = null;
    this.calendar = null;
    this.isInitialized = false;
    // Use the same token file as Google Tasks for shared authentication
    this.tokenPath = path.join(__dirname, '..', 'data', 'google-tokens.json');
    this.calendarId = config.calendarId || 'primary';
  }

  async initialize() {
    try {
      if (!this.config.clientId || !this.config.clientSecret) {
        console.log('  Google Calendar: Not configured (missing client ID/secret)');
        return false;
      }

      this.oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        this.config.redirectUri
      );

      // Try to load existing tokens (shared with Google Tasks)
      if (fs.existsSync(this.tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        
        // Check if token needs refresh
        if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
          try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);
            fs.writeFileSync(this.tokenPath, JSON.stringify(credentials, null, 2));
          } catch (error) {
            console.log('  Google Calendar: Token refresh failed, re-authorization needed');
            return false;
          }
        }

        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        
        // Test connection - check if we have calendar scope
        try {
          await this.calendar.calendarList.list({ maxResults: 1 });
          this.isInitialized = true;
          console.log('✓ Google Calendar service ready');
          return true;
        } catch (error) {
          // Tokens exist but don't have calendar scope - need re-auth with combined scopes
          console.log('  Google Calendar: Missing calendar scope, re-authorization needed');
          console.log(`  → Re-authorize at: ${this.getAuthUrl()}`);
          return false;
        }
      }

      console.log('  Google Calendar: Not authorized (no tokens found)');
      console.log(`  → Authorize at: ${this.getAuthUrl()}`);
      return false;
    } catch (error) {
      console.error('✗ Google Calendar initialization failed:', error.message);
      return false;
    }
  }

  getAuthUrl() {
    if (!this.oauth2Client) {
      this.oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        this.config.redirectUri
      );
    }

    // Include both Tasks and Calendar scopes for combined auth
    const scopes = [
      'https://www.googleapis.com/auth/tasks',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Save tokens
      const dataDir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      this.isInitialized = true;

      console.log('✓ Google Calendar authorized successfully');
      return true;
    } catch (error) {
      console.error('Google Calendar authorization failed:', error.message);
      throw error;
    }
  }

  async getCalendarList() {
    if (!this.isInitialized) {
      throw new Error('Google Calendar not initialized');
    }

    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description || '',
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor
      }));
    } catch (error) {
      console.error('Error fetching calendar list:', error.message);
      throw error;
    }
  }

  async getEvents(startDate, endDate, calendarId = null) {
    if (!this.isInitialized) {
      return [];
    }

    const targetCalendarId = calendarId || this.calendarId || 'primary';

    try {
      const response = await this.calendar.events.list({
        calendarId: targetCalendarId,
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250
      });

      const events = response.data.items || [];
      
      return events.map(event => ({
        id: `google_${event.id}`,
        title: event.summary || 'Untitled',
        description: event.description || '',
        location: event.location || '',
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        allDay: !event.start.dateTime,
        calendar: event.organizer?.displayName || 'Google Calendar',
        calendarId: targetCalendarId,
        source: 'google',
        color: '#4285f4', // Google blue
        attendees: event.attendees?.map(a => a.email) || [],
        recurring: !!event.recurringEventId,
        htmlLink: event.htmlLink
      }));
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error.message);
      return [];
    }
  }

  async getAllCalendarEvents(startDate, endDate) {
    if (!this.isInitialized) {
      return [];
    }

    try {
      // Get all calendars
      const calendars = await this.getCalendarList();
      const allEvents = [];

      for (const calendar of calendars) {
        const events = await this.getEvents(startDate, endDate, calendar.id);
        // Add calendar color to events
        events.forEach(event => {
          event.color = calendar.backgroundColor || '#4285f4';
          event.calendar = calendar.name;
        });
        allEvents.push(...events);
      }

      // Sort by start time
      allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
      
      return allEvents;
    } catch (error) {
      console.error('Error fetching all Google Calendar events:', error.message);
      return [];
    }
  }

  disconnect() {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }
    this.isInitialized = false;
    this.calendar = null;
    console.log('  Google Calendar disconnected');
  }
}

module.exports = GoogleCalendarService;
