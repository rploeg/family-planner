const { createDAVClient } = require('tsdav');
const { EventEmitter } = require('events');
const { RRule, RRuleSet } = require('rrule');

class CalDAVService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.calendars = [];
    this.events = [];
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.client = await createDAVClient({
        serverUrl: this.config.serverUrl,
        credentials: {
          username: this.config.username,
          password: this.config.password
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav'
      });

      this.calendars = await this.client.fetchCalendars();
      this.isInitialized = true;
      
      console.log(`✓ CalDAV initialized - Found ${this.calendars.length} calendars`);
      return true;
    } catch (error) {
      console.error('✗ CalDAV initialization failed:', error.message);
      throw error;
    }
  }

  async syncEvents(startDate, endDate) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const allEvents = [];

      for (const calendar of this.calendars) {
        const calendarObjects = await this.client.fetchCalendarObjects({
          calendar: calendar,
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          expand: true // Request expanded recurring events
        });
        
        console.log(`  Found ${calendarObjects.length} objects in calendar: ${calendar.displayName}`);
        
        for (const obj of calendarObjects) {
          // iCloud CalDAV already expands recurring events, so just parse each instance
          const event = this.parseEvent(obj.data, calendar.displayName || calendar.url);
          allEvents.push(event);
        }
      }

      this.events = allEvents;
      this.emit('eventsUpdated', allEvents);
      
      console.log(`✓ CalDAV sync complete - ${allEvents.length} events`);
      return allEvents;
    } catch (error) {
      console.error('✗ CalDAV sync failed:', error.message);
      throw error;
    }
  }

  parseEvent(icalData, calendarName) {
    // Parse iCalendar data
    const lines = icalData.split('\n').map(l => l.trim());
    
    // Extract DTSTART line to check format
    const dtstartLine = lines.find(l => l.startsWith('DTSTART'));
    const isAllDay = dtstartLine && (dtstartLine.includes('VALUE=DATE') || !dtstartLine.includes('T'));
    
    const event = {
      id: this.extractValue(lines, 'UID') || `event-${Date.now()}`,
      title: this.extractValue(lines, 'SUMMARY') || 'Untitled Event',
      startDate: this.parseDateTime(this.extractValue(lines, 'DTSTART')),
      endDate: this.parseDateTime(this.extractValue(lines, 'DTEND')),
      location: this.extractValue(lines, 'LOCATION') || '',
      notes: this.extractValue(lines, 'DESCRIPTION') || '',
      calendarName: calendarName,
      isAllDay: isAllDay
    };

    // Format date and time
    const startDate = new Date(event.startDate);
    event.date = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!event.isAllDay) {
      event.time = startDate.toLocaleTimeString('nl-NL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      event.time = '';
    }

    // Try to extract person from calendar name or title
    event.person = this.extractPerson(calendarName, event.title);

    return event;
  }

  expandRecurringEvent(icalData, calendarName, startDate, endDate) {
    const lines = icalData.split('\n').map(l => l.trim());
    const rruleLine = lines.find(l => l.startsWith('RRULE:'));
    
    if (!rruleLine) return [this.parseEvent(icalData, calendarName)];

    try {
      // Parse the RRULE
      const rruleStr = rruleLine.substring(6); // Remove "RRULE:"
      const dtstart = this.parseDateTime(this.extractValue(lines, 'DTSTART'));
      const dtend = this.parseDateTime(this.extractValue(lines, 'DTEND'));
      
      console.log(`    DTSTART: ${dtstart}, DTEND: ${dtend}`);
      console.log(`    RRULE: ${rruleStr}`);
      
      // Calculate duration
      const duration = new Date(dtend) - new Date(dtstart);
      
      // Create RRule with DTSTART
      const dtStartDate = new Date(dtstart);
      const rule = RRule.fromString(`DTSTART:${dtStartDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}Z\nRRULE:${rruleStr}`);
      
      // Get all occurrences within the date range
      const occurrences = rule.between(startDate, endDate, true);
      
      console.log(`    Expanded ${occurrences.length} occurrences of "${this.extractValue(lines, 'SUMMARY')}" (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);
      
      // Create an event for each occurrence
      return occurrences.map((occurrence, index) => {
        const occurrenceEnd = new Date(occurrence.getTime() + duration);
        const isAllDay = lines.find(l => l.startsWith('DTSTART')) && 
                        (lines.find(l => l.startsWith('DTSTART')).includes('VALUE=DATE') || 
                         !lines.find(l => l.startsWith('DTSTART')).includes('T'));
        
        return {
          id: `${this.extractValue(lines, 'UID')}-${occurrence.toISOString()}`,
          title: this.extractValue(lines, 'SUMMARY') || 'Untitled Event',
          startDate: occurrence.toISOString(),
          endDate: occurrenceEnd.toISOString(),
          location: this.extractValue(lines, 'LOCATION') || '',
          notes: this.extractValue(lines, 'DESCRIPTION') || '',
          calendarName: calendarName,
          isAllDay: isAllDay,
          date: occurrence.toISOString().split('T')[0],
          time: isAllDay ? '' : occurrence.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          person: this.extractPerson(calendarName, this.extractValue(lines, 'SUMMARY'))
        };
      });
    } catch (error) {
      console.error('    ✗ Failed to expand recurring event:', error.message);
      console.error('    Stack:', error.stack);
      return [this.parseEvent(icalData, calendarName)];
    }
  }

  extractValue(lines, key) {
    const line = lines.find(l => l.startsWith(key + ':') || l.startsWith(key + ';'));
    if (!line) return null;
    
    const colonIndex = line.indexOf(':');
    return colonIndex > -1 ? line.substring(colonIndex + 1).trim() : null;
  }

  parseDateTime(dateTimeStr) {
    if (!dateTimeStr) return null;
    
    // Handle DATE format (YYYYMMDD)
    if (dateTimeStr.length === 8) {
      return new Date(
        dateTimeStr.substring(0, 4),
        parseInt(dateTimeStr.substring(4, 6)) - 1,
        dateTimeStr.substring(6, 8)
      ).toISOString();
    }
    
    // Handle DATETIME format (YYYYMMDDTHHmmss or with Z)
    if (dateTimeStr.includes('T')) {
      const clean = dateTimeStr.replace(/[TZ]/g, '');
      return new Date(
        clean.substring(0, 4),
        parseInt(clean.substring(4, 6)) - 1,
        clean.substring(6, 8),
        clean.substring(8, 10),
        clean.substring(10, 12),
        clean.substring(12, 14)
      ).toISOString();
    }
    
    return new Date(dateTimeStr).toISOString();
  }

  extractPerson(calendarName, title) {
    // Try to extract person name from calendar name
    const commonCalendarNames = ['remco', 'josefien', 'laurens'];
    const lowerCalendar = calendarName.toLowerCase();
    
    for (const name of commonCalendarNames) {
      if (lowerCalendar.includes(name)) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    
    // Default to calendar name if no match
    return calendarName;
  }

  getEvents() {
    return this.events;
  }
}

module.exports = CalDAVService;
