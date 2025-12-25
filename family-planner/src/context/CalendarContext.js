import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const CalendarContext = createContext();

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

export const CalendarProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);

  // Load events from backend API (with CalDAV or cache)
  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get events for the next 180 days (6 months)
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 180);
      
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const response = await api.getEvents(
        formatDate(startDate),
        formatDate(endDate)
      );
      
      // Check if response is cached data or live CalDAV data
      if (response.cached) {
        setIsCached(true);
        setEvents(response.events || []);
        if (response.error) {
          setError(`Using cached data: ${response.error}`);
        }
      } else {
        setIsCached(false);
        // Transform CalDAV events to our format
        const transformedEvents = (Array.isArray(response) ? response : []).map(event => {
          const start = new Date(event.startDate);
          const end = new Date(event.endDate);
          
          // Format time in 24-hour European format (HH:MM)
          const formatTime24h = (date) => {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          };
          
          // Format date in local timezone (avoid UTC shift)
          const formatLocalDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          return {
            id: event.id,
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            date: formatLocalDate(start), // YYYY-MM-DD format in local timezone
            time: event.isAllDay ? '' : formatTime24h(start), // 24-hour format
            location: event.location || '',
            notes: event.notes || '',
            calendar: event.calendarName || 'Personal',
            allDay: event.isAllDay || false,
            attendees: event.attendees || [],
            automation: parseAutomationFromNotes(event.notes)
          };
        });
        
        setEvents(transformedEvents);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      setError(err.message);
      // Fall back to empty array on error
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Parse automation settings from event notes
  const parseAutomationFromNotes = (notes) => {
    if (!notes) return { enabled: false };
    
    try {
      // Look for automation JSON in notes
      const match = notes.match(/\[AUTOMATION\](.*?)\[\/AUTOMATION\]/s);
      if (match) {
        return JSON.parse(match[1]);
      }
    } catch (e) {
      console.warn('Failed to parse automation from notes:', e);
    }
    
    return { enabled: false };
  };

  // Serialize automation settings to notes format
  const serializeAutomationToNotes = (notes, automation) => {
    // Remove existing automation block if present
    let cleanNotes = notes ? notes.replace(/\[AUTOMATION\].*?\[\/AUTOMATION\]/s, '').trim() : '';
    
    // Add automation block if enabled
    if (automation && automation.enabled) {
      const automationJson = JSON.stringify(automation);
      cleanNotes += `\n\n[AUTOMATION]${automationJson}[/AUTOMATION]`;
    }
    
    return cleanNotes;
  };

  // Initialize - load events from Apple Calendar
  useEffect(() => {
    loadEvents();
    
    // Reload events every 30 seconds to stay in sync
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get events for today
  const getTodayEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      // Include event if it overlaps with today at all
      return eventStart <= todayEnd && eventEnd >= today;
    })
      .map(event => adjustEventDisplayForDay(event, today))
      .sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        if (a.allDay && b.allDay) return 0;
        return a.time.localeCompare(b.time);
      });
  };

  // Helper function to adjust event display for a specific day
  const adjustEventDisplayForDay = (event, targetDay) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const dayStart = new Date(targetDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDay);
    dayEnd.setHours(23, 59, 59, 999);

    // Format time in 24-hour European format (HH:MM)
    const formatTime24h = (date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Check if this is a multi-day event
    const eventStartDay = new Date(eventStart);
    eventStartDay.setHours(0, 0, 0, 0);
    const eventEndDay = new Date(eventEnd);
    eventEndDay.setHours(0, 0, 0, 0);
    const isMultiDay = eventEndDay > eventStartDay;

    if (!isMultiDay || event.allDay) {
      // Single day or all-day event - keep original display
      return event;
    }

    // Multi-day event - adjust display based on which day we're viewing
    let displayTime = event.time;
    
    if (eventStart >= dayStart && eventStart <= dayEnd) {
      // Event starts today
      displayTime = `${formatTime24h(eventStart)} →`;
    } else if (eventEnd >= dayStart && eventEnd <= dayEnd) {
      // Event ends today
      displayTime = `→ ${formatTime24h(eventEnd)}`;
    } else {
      // Event continues all day (started before today, ends after today)
      displayTime = '→ All day →';
    }

    return {
      ...event,
      time: displayTime
    };
  };

  // Get upcoming events (next 30 days)
  const getUpcomingEvents = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const nextMonth = new Date(tomorrow);
    nextMonth.setDate(nextMonth.getDate() + 30);

    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate >= tomorrow && eventDate < nextMonth;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  // Create event
  const createEvent = async (eventData) => {
    try {
      // Convert date + time to ISO format for Apple Calendar
      let startDate, endDate;
      
      if (eventData.startDate && eventData.endDate) {
        // Already in ISO format (from update)
        startDate = eventData.startDate;
        endDate = eventData.endDate;
      } else if (eventData.date && eventData.time) {
        // Convert from date + time format (from form)
        const [hours, minutes] = eventData.time.split(':');
        const start = new Date(eventData.date);
        start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        startDate = start.toISOString();
        
        // Default to 1 hour duration
        const end = new Date(start);
        end.setHours(start.getHours() + 1);
        endDate = end.toISOString();
      } else {
        throw new Error('Invalid date/time format');
      }
      
      // Prepare notes with automation settings
      const notes = serializeAutomationToNotes(eventData.notes || '', eventData.automation);
      
      const eventToCreate = {
        title: eventData.title,
        startDate: startDate,
        endDate: endDate,
        location: eventData.location,
        notes: notes,
        calendar: eventData.calendar,
        isAllDay: eventData.allDay || false
      };
      
      // Create in Apple Calendar via backend
      console.warn('Event creation not yet implemented via CalDAV API');
      // TODO: Implement event creation via backend CalDAV API
      await loadEvents();
      throw new Error('Event creation via CalDAV not yet implemented. Please create events in your calendar app.');
    } catch (err) {
      console.error('Failed to create event:', err);
      throw err;
    }
  };

  // Update event
  const updateEvent = async (eventId, updates) => {
    try {
      console.warn('Event updates not yet implemented via CalDAV API');
      // TODO: Implement event updates via backend CalDAV API
      // For now, reload events to show any externally updated events
      await loadEvents();
      throw new Error('Event updates via CalDAV not yet implemented. Please update events in your calendar app.');
    } catch (err) {
      console.error('Failed to update event:', err);
      throw err;
    }
  };

  // Delete event
  const deleteEvent = async (eventId) => {
    try {
      console.warn('Event deletion not yet implemented via CalDAV API');
      // TODO: Implement event deletion via backend CalDAV API
      // For now, reload events to show any externally deleted events
      await loadEvents();
      throw new Error('Event deletion via CalDAV not yet implemented. Please delete events in your calendar app.');
    } catch (err) {
      console.error('Failed to delete event:', err);
      throw err;
    }
  };

  // Format event time
  const formatEventTime = (startDate, endDate, allDay) => {
    if (allDay) {
      return 'All Day';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };

    const formatDate = (date) => {
      const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return `${formatDate(start)} ${formatTime(start)} - ${formatTime(end)}`;
  };

  const value = {
    events,
    loading,
    error,
    getTodayEvents,
    getUpcomingEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    formatEventTime,
    reloadEvents: loadEvents
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};
