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
    this.reminderLists = [];
    this.reminders = [];
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
      
      // Also try to fetch reminder-specific collections
      // iCloud uses the same collections for both, but let's be explicit
      try {
        const account = this.client.account;
        if (account && account.reminderUrl) {
          console.log('  Found reminder URL:', account.reminderUrl);
        }
      } catch (err) {
        // Ignore - not all servers have reminder-specific URLs
      }
      
      this.isInitialized = true;
      
      console.log(`✓ CalDAV initialized - Found ${this.calendars.length} calendars`);
      
      // Log all available calendars/lists for debugging
      console.log('  Available lists:');
      this.calendars.forEach(cal => {
        console.log(`    - ${cal.displayName || cal.url}`);
        console.log(`      URL: ${cal.url}`);
        console.log(`      Components: ${cal.components ? cal.components.join(', ') : 'none'}`);
        console.log(`      Description: ${cal.description || 'none'}`);
      });
      
      // Also fetch reminder lists (task collections)
      // Note: iCloud exposes reminder lists as calendars that support VTODO
      try {
        this.reminderLists = this.calendars.filter(cal => 
          cal.components && cal.components.includes('VTODO')
        );
        
        // If no VTODO-specific lists found, try all calendars (iCloud might not report components correctly)
        if (this.reminderLists.length === 0) {
          console.log('  No VTODO-enabled calendars found, will check all calendars for reminders');
          this.reminderLists = this.calendars;
        }
        
        console.log(`✓ Found ${this.reminderLists.length} potential reminder lists`);
      } catch (error) {
        console.log('  Note: Could not fetch reminder lists:', error.message);
        this.reminderLists = this.calendars; // Fall back to all calendars
      }
      
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

      // Query with a wider range to catch multi-day events that started before the requested range
      // but are still ongoing during the requested period
      const fetchStartDate = new Date(startDate);
      fetchStartDate.setDate(fetchStartDate.getDate() - 30); // Look back 30 days for ongoing events

      for (const calendar of this.calendars) {
        const calendarObjects = await this.client.fetchCalendarObjects({
          calendar: calendar,
          timeRange: {
            start: fetchStartDate.toISOString(),
            end: endDate.toISOString()
          }
        });
        
        console.log(`  Found ${calendarObjects.length} objects in calendar: ${calendar.displayName}`);
        
        const seenEventIds = new Set(); // Track unique event IDs to avoid duplicates
        
        for (const obj of calendarObjects) {
          // Check if this is a recurring event
          if (obj.data.includes('RRULE:')) {
            // Expand recurring event using the wider fetch range to catch multi-day events
            const expandedEvents = this.expandRecurringEvent(obj.data, calendar.displayName || calendar.url, fetchStartDate, endDate);
            for (const event of expandedEvents) {
              if (!seenEventIds.has(event.id)) {
                seenEventIds.add(event.id);
                allEvents.push(event);
              }
            }
          } else {
            // Single event
            const event = this.parseEvent(obj.data, calendar.displayName || calendar.url);
            if (!seenEventIds.has(event.id)) {
              seenEventIds.add(event.id);
              allEvents.push(event);
            }
          }
        }
      }

      // Filter to only include events that overlap with the requested date range
      // This ensures multi-day events that started before the range but are still ongoing are included
      const filteredEvents = allEvents.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        
        // Include event if it overlaps with the date range at all
        return eventStart <= rangeEnd && eventEnd >= rangeStart;
      });
      
      this.events = filteredEvents;
      this.emit('eventsUpdated', filteredEvents);
      
      console.log(`✓ CalDAV sync complete - ${filteredEvents.length} events (${allEvents.length} total fetched)`);
      return filteredEvents;
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
      // Extract DTSTART line and value
      const dtstartLine = lines.find(l => l.startsWith('DTSTART'));
      const dtstart = this.parseDateTime(this.extractValue(lines, 'DTSTART'));
      const dtend = this.parseDateTime(this.extractValue(lines, 'DTEND'));
      const title = this.extractValue(lines, 'SUMMARY') || 'Untitled Event';
      const uid = this.extractValue(lines, 'UID');
      
      // Calculate duration
      const duration = new Date(dtend) - new Date(dtstart);
      
      // Parse RRULE
      const rruleStr = rruleLine.substring(6); // Remove "RRULE:"
      const dtStartDate = new Date(dtstart);
      
      // Create RRule options
      const rruleOptions = {
        dtstart: dtStartDate
      };
      
      // Parse RRULE string manually
      const rruleParts = rruleStr.split(';');
      for (const part of rruleParts) {
        const [key, value] = part.split('=');
        if (key === 'FREQ') rruleOptions.freq = RRule[value];
        else if (key === 'INTERVAL') rruleOptions.interval = parseInt(value);
        else if (key === 'COUNT') rruleOptions.count = parseInt(value);
        else if (key === 'UNTIL') {
          // Parse UNTIL date
          const untilStr = value.replace(/[TZ]/g, '');
          rruleOptions.until = new Date(
            untilStr.substring(0, 4),
            parseInt(untilStr.substring(4, 6)) - 1,
            untilStr.substring(6, 8),
            untilStr.length > 8 ? untilStr.substring(8, 10) : 0,
            untilStr.length > 10 ? untilStr.substring(10, 12) : 0
          );
        }
      }
      
      const rule = new RRule(rruleOptions);
      
      // Get all occurrences within the date range
      const occurrences = rule.between(startDate, endDate, true);
      
      console.log(`    → Expanding "${title}": ${occurrences.length} occurrences from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      
      // Create an event for each occurrence
      return occurrences.map((occurrence) => {
        const occurrenceEnd = new Date(occurrence.getTime() + duration);
        const isAllDay = dtstartLine && (dtstartLine.includes('VALUE=DATE') || !dtstartLine.includes('T'));
        
        return {
          id: `${uid}-${occurrence.toISOString()}`,
          title: title,
          startDate: occurrence.toISOString(),
          endDate: occurrenceEnd.toISOString(),
          location: this.extractValue(lines, 'LOCATION') || '',
          notes: this.extractValue(lines, 'DESCRIPTION') || '',
          calendarName: calendarName,
          isAllDay: isAllDay,
          date: occurrence.toISOString().split('T')[0],
          time: isAllDay ? '' : occurrence.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          person: this.extractPerson(calendarName, title)
        };
      });
    } catch (error) {
      console.error(`    ✗ Failed to expand recurring event "${this.extractValue(lines, 'SUMMARY')}":`, error.message);
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

  // ========================================
  // REMINDER/TASK (VTODO) METHODS
  // ========================================

  async syncReminders(listName = 'Boodschappen') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Find the reminder list by name (case-insensitive, flexible matching)
      let reminderList = this.reminderLists.find(list => {
        const displayName = list.displayName || '';
        const url = list.url || '';
        return displayName.toLowerCase().includes(listName.toLowerCase()) ||
               url.toLowerCase().includes(listName.toLowerCase());
      });

      // If not found in reminder lists, check all calendars
      if (!reminderList) {
        reminderList = this.calendars.find(cal => {
          const displayName = cal.displayName || '';
          const url = cal.url || '';
          return displayName.toLowerCase().includes(listName.toLowerCase()) ||
                 url.toLowerCase().includes(listName.toLowerCase());
        });
      }

      if (!reminderList) {
        console.log(`✗ Reminder list "${listName}" not found`);
        console.log('  Available lists:');
        this.calendars.forEach(c => console.log(`    - ${c.displayName || c.url}`));
        return [];
      }

      console.log(`✓ Found reminder list: ${reminderList.displayName || reminderList.url}`);

      // Fetch tasks from the reminder list
      const tasks = await this.client.fetchCalendarObjects({
        calendar: reminderList
      });

      console.log(`  Found ${tasks.length} objects in reminder list`);

      // Parse VTODO items
      const reminders = [];
      for (const task of tasks) {
        if (task.data && task.data.includes('BEGIN:VTODO')) {
          const reminder = this.parseReminder(task.data, task.url);
          reminders.push(reminder);
        }
      }

      this.reminders = reminders;
      this.emit('remindersUpdated', reminders);
      
      console.log(`✓ Reminder sync complete - ${reminders.length} tasks`);
      return reminders;
    } catch (error) {
      console.error('✗ Reminder sync failed:', error.message);
      throw error;
    }
  }

  parseReminder(vtodoData, url) {
    const lines = vtodoData.split('\n').map(l => l.trim());

    const reminder = {
      id: this.extractValue(lines, 'UID') || `task-${Date.now()}`,
      url: url,
      text: this.extractValue(lines, 'SUMMARY') || '',
      checked: this.extractValue(lines, 'STATUS') === 'COMPLETED',
      description: this.extractValue(lines, 'DESCRIPTION') || '',
      categories: this.extractCategories(lines),
      created: this.parseDateTime(this.extractValue(lines, 'CREATED')) || new Date().toISOString(),
      completed: this.parseDateTime(this.extractValue(lines, 'COMPLETED')) || null,
      lastModified: this.parseDateTime(this.extractValue(lines, 'LAST-MODIFIED')) || new Date().toISOString()
    };

    // Parse description to extract forMeal and addedBy
    const parsed = this.parseReminderDescription(reminder.description);
    reminder.forMeal = parsed.forMeal;
    reminder.addedBy = parsed.addedBy;

    // Map categories to our category system
    if (reminder.categories.length > 0) {
      reminder.category = this.mapCategoryFromiCloud(reminder.categories[0]);
    } else {
      reminder.category = 'household';
    }

    return reminder;
  }

  parseReminderDescription(description) {
    const result = { forMeal: null, addedBy: null };
    
    if (!description) return result;

    const lines = description.split('\n');
    for (const line of lines) {
      // Match "🍽️ Voor {meal}" or "Voor: {meal}"
      const mealMatch = line.match(/🍽️\s*Voor\s+(.+)/i) || line.match(/Voor:\s*(.+)/i);
      if (mealMatch) {
        result.forMeal = mealMatch[1].trim();
      }

      // Match "👤 {person}" or "Door: {person}"
      const personMatch = line.match(/👤\s*(.+)/i) || line.match(/Door:\s*(.+)/i);
      if (personMatch) {
        result.addedBy = personMatch[1].trim();
      }
    }

    return result;
  }

  extractCategories(lines) {
    const categories = [];
    for (const line of lines) {
      if (line.startsWith('CATEGORIES:')) {
        const catValue = line.substring(11).trim();
        categories.push(...catValue.split(',').map(c => c.trim()));
      }
    }
    return categories;
  }

  mapCategoryFromiCloud(icloudCategory) {
    const mapping = {
      'food': 'food',
      'household': 'household',
      'health': 'health',
      'kids': 'kids',
      'pets': 'pets',
      'groceries': 'food',
      'shopping': 'household'
    };
    return mapping[icloudCategory.toLowerCase()] || 'household';
  }

  mapCategoryToiCloud(category) {
    const mapping = {
      'food': 'Food',
      'household': 'Household',
      'health': 'Health',
      'kids': 'Kids',
      'pets': 'Pets'
    };
    return mapping[category] || 'Household';
  }

  createReminderDescription(forMeal, addedBy) {
    const parts = [];
    if (forMeal) parts.push(`🍽️ Voor ${forMeal}`);
    if (addedBy) parts.push(`👤 ${addedBy}`);
    // iCalendar format: multi-line values must use literal \n and be folded with spaces
    return parts.join('\\n');
  }

  async createReminder(listName, item) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Find the reminder list - flexible matching to handle emoji and variations
      let reminderList = this.reminderLists.find(list => 
        list.displayName && list.displayName.toLowerCase().includes(listName.toLowerCase())
      );

      if (!reminderList) {
        reminderList = this.calendars.find(cal => 
          cal.displayName && cal.displayName.toLowerCase().includes(listName.toLowerCase())
        );
      }

      if (!reminderList) {
        throw new Error(`Reminder list "${listName}" not found`);
      }

      // Create VTODO data
      const now = new Date();
      const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const description = this.createReminderDescription(item.forMeal, item.addedBy);
      const category = this.mapCategoryToiCloud(item.category || 'household');
      const status = item.checked ? 'COMPLETED' : 'NEEDS-ACTION';

      const vtodoData = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Family Planner//EN',
        'BEGIN:VTODO',
        `UID:${uid}`,
        `DTSTAMP:${this.formatDateTime(now)}`,
        `CREATED:${this.formatDateTime(now)}`,
        `LAST-MODIFIED:${this.formatDateTime(now)}`,
        `SUMMARY:${item.text}`,
        ...(description ? [`DESCRIPTION:${description}`] : []),
        `CATEGORIES:${category}`,
        `STATUS:${status}`,
        ...(item.checked && item.completedAt ? [`COMPLETED:${this.formatDateTime(new Date(item.completedAt))}`] : []),
        'END:VTODO',
        'END:VCALENDAR'
      ].join('\r\n');

      // Create the task on the server
      const result = await this.client.createCalendarObject({
        calendar: reminderList,
        filename: `${uid}.ics`,
        iCalString: vtodoData
      });

      console.log(`✓ Created reminder: ${item.text} (UID: ${uid})`);
      console.log(`  List URL: ${reminderList.url}`);
      console.log(`  Result:`, result);
      return uid;
    } catch (error) {
      console.error('✗ Failed to create reminder:', error.message);
      throw error;
    }
  }

  async updateReminder(listName, reminderId, updates) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Find the reminder list - flexible matching to handle emoji and variations
      let reminderList = this.reminderLists.find(list => 
        list.displayName && list.displayName.toLowerCase().includes(listName.toLowerCase())
      );

      if (!reminderList) {
        reminderList = this.calendars.find(cal => 
          cal.displayName && cal.displayName.toLowerCase().includes(listName.toLowerCase())
        );
      }

      if (!reminderList) {
        throw new Error(`Reminder list "${listName}" not found`);
      }

      // Find the existing reminder
      const reminder = this.reminders.find(r => r.id === reminderId);
      if (!reminder) {
        throw new Error(`Reminder ${reminderId} not found`);
      }

      // Create updated VTODO data
      const now = new Date();
      const description = this.createReminderDescription(
        updates.forMeal !== undefined ? updates.forMeal : reminder.forMeal,
        updates.addedBy !== undefined ? updates.addedBy : reminder.addedBy
      );
      const category = this.mapCategoryToiCloud(updates.category || reminder.category || 'household');
      const status = (updates.checked !== undefined ? updates.checked : reminder.checked) ? 'COMPLETED' : 'NEEDS-ACTION';
      const text = updates.text !== undefined ? updates.text : reminder.text;

      const vtodoData = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Family Planner//EN',
        'BEGIN:VTODO',
        `UID:${reminderId}`,
        `DTSTAMP:${this.formatDateTime(now)}`,
        `CREATED:${reminder.created ? this.formatDateTime(new Date(reminder.created)) : this.formatDateTime(now)}`,
        `LAST-MODIFIED:${this.formatDateTime(now)}`,
        `SUMMARY:${text}`,
        ...(description ? [`DESCRIPTION:${description}`] : []),
        `CATEGORIES:${category}`,
        `STATUS:${status}`,
        ...(status === 'COMPLETED' ? [`COMPLETED:${this.formatDateTime(now)}`] : []),
        'END:VTODO',
        'END:VCALENDAR'
      ].join('\r\n');

      // Update the task on the server
      await this.client.updateCalendarObject({
        calendarObject: {
          url: reminder.url,
          data: vtodoData,
          etag: reminder.etag
        }
      });

      console.log(`✓ Updated reminder: ${text}`);
      return true;
    } catch (error) {
      console.error('✗ Failed to update reminder:', error.message);
      throw error;
    }
  }

  async deleteReminder(listName, reminderId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const reminder = this.reminders.find(r => r.id === reminderId);
      if (!reminder) {
        throw new Error(`Reminder ${reminderId} not found`);
      }

      await this.client.deleteCalendarObject({
        calendarObject: {
          url: reminder.url,
          etag: reminder.etag
        }
      });

      console.log(`✓ Deleted reminder: ${reminder.text}`);
      return true;
    } catch (error) {
      console.error('✗ Failed to delete reminder:', error.message);
      throw error;
    }
  }

  formatDateTime(date) {
    // Format: YYYYMMDDTHHmmssZ
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  }

  getReminders() {
    return this.reminders;
  }
}

module.exports = CalDAVService;
