import React, { useState, useEffect } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useMeals } from '../context/MealsContext';
import { useLoxone } from '../context/LoxoneContext';
import { useTranslation } from 'react-i18next';
import weatherService from '../services/weatherService';
import api from '../services/api';
import EventCard from '../components/EventCard';
import './BriefingPage.css';

const BriefingPage = () => {
  const { getTodayEvents, events } = useCalendar();
  const { getMealsForDate } = useMeals();
  const { users } = useLoxone();
  const { t, i18n } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loxoneAvailable, setLoxoneAvailable] = useState(false);
  const todayEvents = getTodayEvents();

  // Debug logging
  useEffect(() => {
    console.log('All events:', events);
    console.log('Today events:', todayEvents);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    console.log('Today date string:', todayStr);
  }, [events, todayEvents]);

  useEffect(() => {
    loadWeather();
    loadLoxoneData();
  }, []);

  const loadWeather = async () => {
    try {
      const data = await weatherService.getWeather();
      setWeather(data);
    } catch (error) {
      console.error('Failed to load weather:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLoxoneData = async () => {
    try {
      // Check if Loxone is available
      const status = await api.getLoxoneStatus();
      setLoxoneAvailable(status.initialized);

      if (status.initialized) {
        // Load room data and suggestions
        const [roomsData, suggestionsData] = await Promise.all([
          api.getLoxoneRooms(),
          api.getLoxoneSuggestions()
        ]);
        setRooms(roomsData);
        setSuggestions(suggestionsData);
      }
    } catch (error) {
      console.error('Failed to load Loxone data:', error);
      setLoxoneAvailable(false);
    }
  };

  const getTomorrowEvents = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    return events.filter(event => event.date === tomorrowStr);
  };

  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  };

  const tomorrowEvents = getTomorrowEvents();
  const todayMeals = getMealsForDate(getTodayDateString());
  const tomorrowMeals = getMealsForDate(getTomorrowDateString());

  const getMealIcon = (type) => {
    const icons = {
      breakfast: '🍳',
      lunch: '🥪',
      dinner: '🍽️',
      snack: '🍪'
    };
    return icons[type] || '🍽️';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return i18n.language === 'nl' ? 'Goedemorgen' : 'Good Morning';
    if (hour < 18) return i18n.language === 'nl' ? 'Goedemiddag' : 'Good Afternoon';
    return i18n.language === 'nl' ? 'Goedenavond' : 'Good Evening';
  };

  const getOutdoorEvents = () => {
    return todayEvents.filter(event => {
      const location = event.location?.toLowerCase() || '';
      const title = event.title?.toLowerCase() || '';
      return location.includes('park') || location.includes('buiten') || 
             location.includes('outdoor') || title.includes('outdoor') ||
             title.includes('buiten') || location.includes('tuin');
    });
  };

  const outdoorEvents = getOutdoorEvents();
  const showWeatherWarning = outdoorEvents.length > 0 && weather && 
    !weatherService.isOutdoorFriendly(weather).suitable;

  return (
    <div className="briefing-page">
      {/* Date Display */}
      <section className="briefing-section date-section">
        <p className="date-display">
          {new Date().toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </section>

      {/* Weather Warning for Outdoor Events */}
      {showWeatherWarning && (
        <section className="briefing-section warning-section">
          <div className="warning-card">
            <div className="warning-header">
              <span className="warning-icon">⚠️</span>
              <h3>{t('briefing.outdoorAlert')}</h3>
            </div>
            <p>{t('briefing.weatherWarning')}</p>
            <div className="affected-events">
              {outdoorEvents.map(event => (
                <div key={event.id} className="warning-event">
                  <span>{event.time}</span>
                  <span>{event.title}</span>
                  <span className="event-location">📍 {event.location}</span>
                </div>
              ))}
            </div>
            <p className="warning-reason">
              {weatherService.isOutdoorFriendly(weather).reason}
            </p>
          </div>
        </section>
      )}

      {/* Today's Events Section */}
      <section className="briefing-section events-section">
        <h3 className="section-title">
          {t('briefing.todaysEvents')} ({todayEvents.length})
        </h3>
        
        {/* Today's Meals */}
        {todayMeals.length > 0 && (
          <div className="meals-preview">
            {todayMeals.map(meal => (
              <div key={meal.id} className="meal-preview-item">
                <span className="meal-preview-icon">{getMealIcon(meal.type)}</span>
                <span className="meal-preview-title">{meal.title}</span>
              </div>
            ))}
          </div>
        )}
        
        {todayEvents.length === 0 ? (
          <p className="empty-message">{t('calendar.noEvents')}</p>
        ) : (
          <div className="briefing-events">
            {todayEvents.map(event => (
              <EventCard key={event.id} event={event} onClick={() => {}} />
            ))}
          </div>
        )}
      </section>

      {/* Tomorrow's Events Section */}
      <section className="briefing-section events-section">
        <h3 className="section-title">
          {i18n.language === 'nl' ? 'Morgen' : 'Tomorrow'} ({tomorrowEvents.length})
        </h3>
        
        {/* Tomorrow's Meals */}
        {tomorrowMeals.length > 0 && (
          <div className="meals-preview">
            {tomorrowMeals.map(meal => (
              <div key={meal.id} className="meal-preview-item">
                <span className="meal-preview-icon">{getMealIcon(meal.type)}</span>
                <span className="meal-preview-title">{meal.title}</span>
              </div>
            ))}
          </div>
        )}
        
        {tomorrowEvents.length === 0 ? (
          <p className="empty-message">{t('calendar.noEvents')}</p>
        ) : (
          <div className="briefing-events">
            {tomorrowEvents.map(event => (
              <EventCard key={event.id} event={event} onClick={() => {}} />
            ))}
          </div>
        )}
      </section>

      {/* Loxone Suggestions Section */}
      {loxoneAvailable && suggestions.length > 0 && (
        <section className="briefing-section suggestions-section">
          <h3 className="section-title">
            💡 {i18n.language === 'nl' ? 'Suggesties' : 'Suggestions'}
          </h3>
          <div className="suggestions-grid">
            {suggestions.map((suggestion, index) => (
              <div key={index} className={`suggestion-card priority-${suggestion.priority}`}>
                <div className="suggestion-header">
                  <span className="suggestion-icon">
                    {suggestion.type === 'temperature' ? '🌡️' : '📍'}
                  </span>
                  <span className="suggestion-room">{suggestion.room}</span>
                </div>
                <p className="suggestion-message">{suggestion.message}</p>
                {suggestion.action && (
                  <button className="suggestion-action">
                    {suggestion.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Room Status Section */}
      {loxoneAvailable && rooms.length > 0 && (
        <section className="briefing-section rooms-section">
          <h3 className="section-title">
            🏠 {i18n.language === 'nl' ? 'Kamer Status' : 'Room Status'}
          </h3>
          <div className="rooms-grid">
            {rooms.map((room, index) => (
              <div key={index} className="room-card">
                <div className="room-header">
                  <span className="room-name">{room.name}</span>
                  {room.status && (
                    <span className={`room-status status-${room.status.toLowerCase().replace(/\s/g, '-')}`}>
                      {room.status}
                    </span>
                  )}
                </div>
                <div className="room-info">
                  {room.actualTemp && (
                    <div className="room-temp">
                      <span className="temp-icon">🌡️</span>
                      <span className="temp-value">{room.actualTemp.toFixed(1)}°C</span>
                      {room.targetTemp && room.actualTemp !== room.targetTemp && (
                        <span className="temp-target">→ {room.targetTemp}°C</span>
                      )}
                    </div>
                  )}
                  {room.occupied && (
                    <div className="room-occupied">
                      <span className="occupied-icon">👤</span>
                      <span>{i18n.language === 'nl' ? 'Bezet' : 'Occupied'}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Family Status Section */}
      <section className="briefing-section family-section">
        <h3 className="section-title">
          {i18n.language === 'nl' ? 'Familie Status' : 'Family Status'}
        </h3>
        <div className="family-status-grid">
          {users.map(user => (
            <div key={user.uuid} className="family-member-status">
              <div className="member-avatar">
                {user.firstName.charAt(0)}
              </div>
              <div className="member-info">
                <span className="member-name">{user.firstName}</span>
                <span className="member-status">{user.status || 'Unknown'}</span>
              </div>
              <div className={`status-indicator ${user.location ? 'home' : 'away'}`}>
                {user.location ? '🏠' : '🚪'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BriefingPage;
