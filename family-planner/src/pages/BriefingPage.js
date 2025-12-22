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
  const [rooms, setRooms] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loxoneAvailable, setLoxoneAvailable] = useState(false);
  const [energyData, setEnergyData] = useState(null);
  const [sensorsData, setSensorsData] = useState(null);
  const [lightsData, setLightsData] = useState(null);
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
    }
  };

  const loadLoxoneData = async () => {
    try {
      // Check if Loxone is available
      const status = await api.getLoxoneStatus();
      console.log('Loxone status:', status);
      setLoxoneAvailable(status.initialized);

      if (status.initialized) {
        // Load real room data, suggestions, energy and sensors
        const [roomsData, suggestionsData, energyResponse, sensorsResponse, lightsResponse] = await Promise.all([
          api.getLoxoneRooms(),
          api.getLoxoneSuggestions(),
          api.getLoxoneEnergy(),
          api.getLoxoneSensors(),
          api.getLoxoneLights()
        ]);
        console.log('Energy data:', energyResponse);
        console.log('Sensors data:', sensorsResponse);
        console.log('Lights data:', lightsResponse);
        setRooms(roomsData);
        setSuggestions(suggestionsData);
        setEnergyData(energyResponse);
        setSensorsData(sensorsResponse);
        setLightsData(lightsResponse);
      } else {
        // Use sample data to showcase the UI
        const sampleRooms = [
          { name: 'Home Office', actualTemp: 18, targetTemp: 21, status: 'Ready', occupied: false },
          { name: 'Living Room', actualTemp: 22, targetTemp: 22, status: 'Occupied', occupied: true },
          { name: 'Kitchen', actualTemp: 21, targetTemp: 21, status: 'Ready', occupied: false }
        ];
        
        const sampleSuggestions = [
          {
            type: 'temperature',
            room: 'Home Office',
            message: 'Home Office is 18°C (target: 21°C). Warm up before work?',
            priority: 'medium',
            action: 'warm up'
          }
        ];
        
        setRooms(sampleRooms);
        setSuggestions(sampleSuggestions);
        setLoxoneAvailable(true); // Show sample data
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

  const getDayAfterTomorrowEvents = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = `${dayAfter.getFullYear()}-${String(dayAfter.getMonth() + 1).padStart(2, '0')}-${String(dayAfter.getDate()).padStart(2, '0')}`;
    return events.filter(event => event.date === dayAfterStr);
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

  const getDayAfterTomorrowDateString = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return `${dayAfter.getFullYear()}-${String(dayAfter.getMonth() + 1).padStart(2, '0')}-${String(dayAfter.getDate()).padStart(2, '0')}`;
  };

  const getDayAfterTomorrowLabel = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const tomorrowEvents = getTomorrowEvents();
  const dayAfterTomorrowEvents = getDayAfterTomorrowEvents();
  const todayMeals = getMealsForDate(getTodayDateString());
  const tomorrowMeals = getMealsForDate(getTomorrowDateString());
  const dayAfterTomorrowMeals = getMealsForDate(getDayAfterTomorrowDateString());

  const getMealIcon = (type) => {
    const icons = {
      breakfast: '🍳',
      lunch: '🥪',
      dinner: '🍽️',
      snack: '🍪'
    };
    return icons[type] || '🍽️';
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

  // Debug logging
  console.log('BriefingPage render:', {
    loxoneAvailable,
    energyData,
    sensorsData,
    lightsData,
    showLiveData: loxoneAvailable && (energyData || sensorsData || lightsData)
  });

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

      {/* Day After Tomorrow's Events Section */}
      <section className="briefing-section events-section">
        <h3 className="section-title">
          {getDayAfterTomorrowLabel()} ({dayAfterTomorrowEvents.length})
        </h3>
        
        {/* Day After Tomorrow's Meals */}
        {dayAfterTomorrowMeals.length > 0 && (
          <div className="meals-preview">
            {dayAfterTomorrowMeals.map(meal => (
              <div key={meal.id} className="meal-preview-item">
                <span className="meal-preview-icon">{getMealIcon(meal.type)}</span>
                <span className="meal-preview-title">{meal.title}</span>
              </div>
            ))}
          </div>
        )}
        
        {dayAfterTomorrowEvents.length === 0 ? (
          <p className="empty-message">{t('calendar.noEvents')}</p>
        ) : (
          <div className="briefing-events">
            {dayAfterTomorrowEvents.map(event => (
              <EventCard key={event.id} event={event} onClick={() => {}} />
            ))}
          </div>
        )}
      </section>

      {/* Loxone Live Data Section */}
      {loxoneAvailable && (energyData || sensorsData || lightsData) && (
        <section className="briefing-section loxone-live-section">
          <h3 className="section-title">
            ⚡ {i18n.language === 'nl' ? 'Live Data' : 'Live Data'}
          </h3>
          <div className="loxone-live-grid">
            {/* Energy Meter */}
            {energyData && energyData.currentUsage !== null && (
              <div className="loxone-live-card energy-card">
                <div className="card-icon">⚡</div>
                <div className="card-content">
                  <div className="card-label">{i18n.language === 'nl' ? 'Huidig Verbruik' : 'Current Usage'}</div>
                  <div className="card-value">{(energyData.currentUsage * 1000).toFixed(0)} W</div>
                  <div className="card-sublabel">P1 Meter</div>
                </div>
              </div>
            )}
            
            {/* Temperature Sensor */}
            {sensorsData && sensorsData.find(s => s.type === 'temperature') && (
              <div className="loxone-live-card temp-card">
                <div className="card-icon">🌡️</div>
                <div className="card-content">
                  <div className="card-label">{i18n.language === 'nl' ? 'Temperatuur' : 'Temperature'}</div>
                  <div className="card-value">{sensorsData.find(s => s.type === 'temperature').value.toFixed(1)}°C</div>
                  <div className="card-sublabel">{sensorsData.find(s => s.type === 'temperature').name}</div>
                </div>
              </div>
            )}
            
            {/* Humidity Sensor */}
            {sensorsData && sensorsData.find(s => s.type === 'humidity') && (
              <div className="loxone-live-card humidity-card">
                <div className="card-icon">💧</div>
                <div className="card-content">
                  <div className="card-label">{i18n.language === 'nl' ? 'Luchtvochtigheid' : 'Humidity'}</div>
                  <div className="card-value">{sensorsData.find(s => s.type === 'humidity').value.toFixed(0)}%</div>
                  <div className="card-sublabel">{sensorsData.find(s => s.type === 'humidity').name}</div>
                </div>
              </div>
            )}
            
            {/* Occupancy Status */}
            {rooms && rooms.length > 0 && rooms[0].room && (
              <div className="loxone-live-card occupancy-card">
                <div className="card-icon">{rooms[0].occupied ? '👤' : '🚪'}</div>
                <div className="card-content">
                  <div className="card-label">{i18n.language === 'nl' ? 'Aanwezigheid' : 'Occupancy'}</div>
                  <div className="card-value">{rooms[0].occupied ? (i18n.language === 'nl' ? 'Bezet' : 'Occupied') : (i18n.language === 'nl' ? 'Leeg' : 'Empty')}</div>
                  <div className="card-sublabel">{rooms[0].room}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

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
    </div>
  );
};

export default BriefingPage;
