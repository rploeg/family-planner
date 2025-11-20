import React, { useState } from 'react';
import { useCalendar } from '../context/CalendarContext';
import EventCard from '../components/EventCard';
import EventModal from '../components/EventModal';
import CalendarSettings from '../components/CalendarSettings';
import WeekTimeline from '../components/WeekTimeline';
import './CalendarPage.css';

const CalendarPage = () => {
  const { getTodayEvents, getUpcomingEvents } = useCalendar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const todayEvents = getTodayEvents();
  const upcomingEvents = getUpcomingEvents();

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div className="page-title-wrapper">
          <p className="page-subtitle">APPLE CALENDAR INTEGRATION</p>
          <h2 className="page-title">CALENDAR</h2>
        </div>
        <div className="header-actions">
          <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} title="Calendar Settings">
            ⚙️
          </button>
          <button className="add-btn" onClick={handleAddEvent}>
            ➕
          </button>
        </div>
      </div>

      <WeekTimeline onEventClick={handleEventClick} />

      <section className="section">
        <h3 className="section-title">Today's Schedule ›</h3>
        <div className="card-grid">
          {todayEvents.length === 0 ? (
            <p className="empty-message">No events scheduled for today</p>
          ) : (
            todayEvents.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                onClick={() => handleEventClick(event)}
              />
            ))
          )}
        </div>
      </section>

      <section className="section">
        <h3 className="section-title">Upcoming Events ({upcomingEvents.length}) ›</h3>
        <div className="card-grid">
          {upcomingEvents.length === 0 ? (
            <p className="empty-message">No upcoming events</p>
          ) : (
            upcomingEvents.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                onClick={() => handleEventClick(event)}
              />
            ))
          )}
        </div>
      </section>

      {isModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <CalendarSettings
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default CalendarPage;
