import React from 'react';
import './EventCard.css';

const EventCard = ({ event, onClick }) => {
  // Get first names of attendees
  const getAttendeeNames = (attendees) => {
    if (!attendees || attendees.length === 0) return null;
    return attendees.map(email => email.split('@')[0]).join(', ');
  };

  // Get calendar color
  const getCalendarColor = (calendar) => {
    const lowerCalendar = calendar?.toLowerCase() || '';
    
    // Match your iCloud calendars
    if (lowerCalendar.includes('gezin') || lowerCalendar === 'family') {
      return '#ff9500'; // Orange for family/gezin
    }
    if (lowerCalendar.includes('privé') || lowerCalendar.includes('prive') || lowerCalendar === 'personal') {
      return '#5856d6'; // Purple for personal/privé
    }
    if (lowerCalendar.includes('work') || lowerCalendar.includes('werk')) {
      return '#0078d4'; // Blue for work
    }
    if (lowerCalendar.includes('remco')) {
      return '#34c759'; // Green for Remco
    }
    if (lowerCalendar.includes('josefien')) {
      return '#ff2d55'; // Pink for Josefien
    }
    if (lowerCalendar.includes('laurens')) {
      return '#00c7be'; // Teal for Laurens
    }
    
    // Default color
    return '#8e8e93'; // Gray
  };

  // Check if event has automation
  const hasAutomation = event.automation && 
    (event.automation.room || event.automation.temperature || 
     event.automation.musicPreset || event.automation.tempAccess);

  return (
    <div 
      className="event-card" 
      onClick={() => onClick(event)}
      style={{ borderLeftColor: getCalendarColor(event.calendar) }}
    >
      <div className="event-time">{event.time}</div>
      <div className="event-details">
        <h4 className="event-title">{event.title}</h4>
        {event.location && (
          <div className="event-location">📍 {event.location}</div>
        )}
        {event.attendees && event.attendees.length > 0 && (
          <div className="event-attendees">👥 {getAttendeeNames(event.attendees)}</div>
        )}
        <div className="event-meta">
          <span className="event-calendar">{event.calendar}</span>
          {hasAutomation && (
            <span className="automation-badge">🏠 Automation</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
