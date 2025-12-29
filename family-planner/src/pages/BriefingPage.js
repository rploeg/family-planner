import React, { useState, useEffect } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useMeals } from '../context/MealsContext';
import { useTranslation } from 'react-i18next';
import weatherService from '../services/weatherService';
import api from '../services/api';
import EventCard from '../components/EventCard';
import SmartAlert from '../components/SmartAlert';
import './BriefingPage.css';

const BriefingPage = ({ allAlerts = [], dismissedAlertIds = [], onNavigate }) => {
  const { getTodayEvents, events } = useCalendar();
  const { getMealsForDate } = useMeals();
  const { t, i18n } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loxoneAvailable, setLoxoneAvailable] = useState(false);
  const [energyData, setEnergyData] = useState(null);
  const [sensorsData, setSensorsData] = useState(null);
  const [lightsData, setLightsData] = useState(null);
  const [prevEnergyData, setPrevEnergyData] = useState(null);
  const [tasksWithDueDate, setTasksWithDueDate] = useState([]);
  const todayEvents = getTodayEvents();

  console.log('BriefingPage received props:', {
    allAlertsCount: allAlerts.length,
    allAlerts: allAlerts.map(a => ({ type: a.type, title: a.title, eventDate: a.eventDate })),
    dismissedAlertIdsCount: dismissedAlertIds.length,
    dismissedAlertIds
  });

  // Filter alerts to only show non-dismissed ones
  const smartAlerts = allAlerts.filter(alert => {
    const alertId = `${alert.type}-${alert.title}`;
    const eventSpecificId = alert.eventDate ? `${alertId}-${alert.eventDate}` : alertId;
    const isDismissed = dismissedAlertIds.includes(eventSpecificId) || dismissedAlertIds.includes(alertId);
    
    console.log('BriefingPage checking alert:', {
      type: alert.type,
      title: alert.title,
      eventDate: alert.eventDate,
      alertId,
      eventSpecificId,
      dismissedAlertIds,
      isDismissed
    });
    
    return !isDismissed;
  });

  console.log('BriefingPage filtered smartAlerts:', smartAlerts.length);

  const handleDismissAlert = (alert) => {
    const alertId = `${alert.type}-${alert.title}`;
    const storageId = alert.eventDate ? `${alertId}-${alert.eventDate}` : alertId;
    
    try {
      const stored = localStorage.getItem('dismissedAlerts');
      const dismissed = stored ? JSON.parse(stored) : {};
      dismissed[storageId] = new Date().toISOString();
      localStorage.setItem('dismissedAlerts', JSON.stringify(dismissed));
      
      // Notify App.js to refresh dismissed alerts
      window.dispatchEvent(new Event('dismissedAlertsChanged'));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

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
    loadTasksWithDueDate();

    // Refresh Loxone data every 60 seconds
    const loxoneInterval = setInterval(() => {
      loadLoxoneData();
    }, 60000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(loxoneInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No longer need to update smart alerts - they come from props now

  const loadTasksWithDueDate = async () => {
    try {
      const tasks = await api.getTasksWithDueDate();
      setTasksWithDueDate(tasks);
    } catch (error) {
      console.error('Failed to load tasks with due dates:', error);
    }
  };

  const loadWeather = async () => {
    try {
      // Use backend weather API
      const lang = i18n.language === 'nl' ? 'nl' : 'en';
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3002';
      const response = await fetch(`${API_BASE_URL}/api/weather?lang=${lang}`);
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      
      // Map the backend weather data to the format expected by the UI
      setWeather({
        temperature: data.current.temperature,
        feelsLike: data.current.feelsLike,
        humidity: data.current.humidity,
        windSpeed: data.current.windSpeed,
        precipitation: data.hourly[0]?.precipitationProbability || 0,
        description: data.current.condition,
        icon: data.current.icon,
        hourly: data.hourly,
        daily: data.daily
      });
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
        // Load real room data, energy and sensors
        const [roomsData, energyResponse, sensorsResponse, lightsResponse] = await Promise.all([
          api.getLoxoneRooms(),
          api.getLoxoneEnergy(),
          api.getLoxoneSensors(),
          api.getLoxoneLights()
        ]);
        console.log('Energy data:', energyResponse);
        console.log('Sensors data:', sensorsResponse);
        console.log('Lights data:', lightsResponse);
        setRooms(roomsData);
        setEnergyData(energyResponse);
        setSensorsData(sensorsResponse);
        setLightsData(lightsResponse);
      } else {
        // Loxone not available - don't show sample data
        setLoxoneAvailable(false);
      }
    } catch (error) {
      console.error('Failed to load Loxone data:', error);
      setLoxoneAvailable(false);
    }
  };

  // Calculate power trend
  const getPowerTrend = () => {
    if (!energyData || !prevEnergyData) return null;
    const diff = energyData.currentUsage - prevEnergyData.currentUsage;
    if (diff > 0.05) return 'up';
    if (diff < -0.05) return 'down';
    return 'stable';
  };

  // Update prevEnergyData for trend calculation
  useEffect(() => {
    if (energyData) {
      const timer = setTimeout(() => {
        setPrevEnergyData(energyData);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [energyData]);

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

  const getTomorrowEvents = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      // Include event if it overlaps with tomorrow at all
      return eventStart <= tomorrowEnd && eventEnd >= tomorrow;
    }).map(event => adjustEventDisplayForDay(event, tomorrow));
  };

  const getDayAfterTomorrowEvents = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(0, 0, 0, 0);
    const dayAfterEnd = new Date(dayAfter);
    dayAfterEnd.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      // Include event if it overlaps with that day at all
      return eventStart <= dayAfterEnd && eventEnd >= dayAfter;
    }).map(event => adjustEventDisplayForDay(event, dayAfter));
  };

  const getDay3Events = () => {
    const day3 = new Date();
    day3.setDate(day3.getDate() + 3);
    day3.setHours(0, 0, 0, 0);
    const day3End = new Date(day3);
    day3End.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return eventStart <= day3End && eventEnd >= day3;
    }).map(event => adjustEventDisplayForDay(event, day3));
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

  const getDay3DateString = () => {
    const day3 = new Date();
    day3.setDate(day3.getDate() + 3);
    return `${day3.getFullYear()}-${String(day3.getMonth() + 1).padStart(2, '0')}-${String(day3.getDate()).padStart(2, '0')}`;
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

  const getDay3Label = () => {
    const day3 = new Date();
    day3.setDate(day3.getDate() + 3);
    return day3.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const tomorrowEvents = getTomorrowEvents();
  const dayAfterTomorrowEvents = getDayAfterTomorrowEvents();
  const day3Events = getDay3Events();
  const todayMeals = getMealsForDate(getTodayDateString());
  const tomorrowMeals = getMealsForDate(getTomorrowDateString());
  const dayAfterTomorrowMeals = getMealsForDate(getDayAfterTomorrowDateString());
  const day3Meals = getMealsForDate(getDay3DateString());

  // Filter tasks by date
  const getTasksForDate = (dateString) => {
    return tasksWithDueDate.filter(task => {
      if (!task.dueDate || task.checked) return false;
      return task.dueDate === dateString;
    });
  };

  const todayTasks = getTasksForDate(getTodayDateString());
  const tomorrowTasks = getTasksForDate(getTomorrowDateString());
  const dayAfterTomorrowTasks = getTasksForDate(getDayAfterTomorrowDateString());
  const day3Tasks = getTasksForDate(getDay3DateString());

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
      {/* Main Content Area - comes first in DOM, but flex order puts sidebar on right */}
      <div className="dashboard-main">
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

        {/* Smart Alerts */}
        {smartAlerts.length > 0 && (
          <section className="briefing-section smart-alerts-section">
            {smartAlerts.map((alert, index) => (
              <SmartAlert 
                key={`${alert.type}-${alert.title}-${index}`}
                suggestion={alert}
                onDismiss={() => handleDismissAlert(alert)}
              />
            ))}
          </section>
        )}

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

        {/* Three Day Columns - Today, Tomorrow, Day After */}
        <div className="days-container">
          {/* Today's Events Section */}
          <section className="briefing-section events-section">
            <h3 className="section-title">
              {t('briefing.todaysEvents')} ({todayEvents.length + todayTasks.length})
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

            {/* Today's Tasks */}
            {todayTasks.length > 0 && (
              <div className="tasks-preview">
                {todayTasks.map(task => (
                  <div key={task.id} className="task-preview-item">
                    <span className="task-preview-icon">✓</span>
                    <span className="task-preview-title">{task.text}</span>
                    <span className="task-preview-list">{task.listName}</span>
                  </div>
                ))}
              </div>
            )}
            
            {todayEvents.length === 0 && todayTasks.length === 0 ? (
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
              {i18n.language === 'nl' ? 'Morgen' : 'Tomorrow'} ({tomorrowEvents.length + tomorrowTasks.length})
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

            {/* Tomorrow's Tasks */}
            {tomorrowTasks.length > 0 && (
              <div className="tasks-preview">
                {tomorrowTasks.map(task => (
                  <div key={task.id} className="task-preview-item">
                    <span className="task-preview-icon">✓</span>
                    <span className="task-preview-title">{task.text}</span>
                    <span className="task-preview-list">{task.listName}</span>
                  </div>
                ))}
              </div>
            )}
            
            {tomorrowEvents.length === 0 && tomorrowTasks.length === 0 ? (
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
              {getDayAfterTomorrowLabel()} ({dayAfterTomorrowEvents.length + dayAfterTomorrowTasks.length})
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

            {/* Day After Tomorrow's Tasks */}
            {dayAfterTomorrowTasks.length > 0 && (
              <div className="tasks-preview">
                {dayAfterTomorrowTasks.map(task => (
                  <div key={task.id} className="task-preview-item">
                    <span className="task-preview-icon">✓</span>
                    <span className="task-preview-title">{task.text}</span>
                    <span className="task-preview-list">{task.listName}</span>
                  </div>
                ))}
              </div>
            )}
            
            {dayAfterTomorrowEvents.length === 0 && dayAfterTomorrowTasks.length === 0 ? (
              <p className="empty-message">{t('calendar.noEvents')}</p>
            ) : (
              <div className="briefing-events">
                {dayAfterTomorrowEvents.map(event => (
                  <EventCard key={event.id} event={event} onClick={() => {}} />
                ))}
              </div>
            )}
          </section>

          {/* Day 3 Events Section */}
          <section className="briefing-section events-section">
            <h3 className="section-title">
              {getDay3Label()} ({day3Events.length + day3Tasks.length})
            </h3>
            
            {/* Day 3 Meals */}
            {day3Meals.length > 0 && (
              <div className="meals-preview">
                {day3Meals.map(meal => (
                  <div key={meal.id} className="meal-preview-item">
                    <span className="meal-preview-icon">{getMealIcon(meal.type)}</span>
                    <span className="meal-preview-title">{meal.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Day 3 Tasks */}
            {day3Tasks.length > 0 && (
              <div className="tasks-preview">
                {day3Tasks.map(task => (
                  <div key={task.id} className="task-preview-item">
                    <span className="task-preview-icon">✓</span>
                    <span className="task-preview-title">{task.text}</span>
                    <span className="task-preview-list">{task.listName}</span>
                  </div>
                ))}
              </div>
            )}
            
            {day3Events.length === 0 && day3Tasks.length === 0 ? (
              <p className="empty-message">{t('calendar.noEvents')}</p>
            ) : (
              <div className="briefing-events">
                {day3Events.map(event => (
                  <EventCard key={event.id} event={event} onClick={() => {}} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Large Screen Sidebar - Weather & Stats (iPad Pro 12.9" only) */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-section weather-widget">
          <h3 className="sidebar-title">
            {i18n.language === 'nl' ? '🌤️ Weer' : '🌤️ Weather'}
          </h3>
          {weather ? (
            <div className="weather-widget-content">
              <div className="weather-main-display">
                <span className="weather-icon-large">{weather.icon || '☁️'}</span>
                <span className="weather-temp-large">{weather.temperature ?? '--'}°</span>
              </div>
              <div className="weather-condition">{weather.description || ''}</div>
              <div className="weather-details-grid">
                <div className="weather-detail-item">
                  <span className="detail-icon">💨</span>
                  <span className="detail-value">{weather.windSpeed ?? '--'} km/h</span>
                </div>
                <div className="weather-detail-item">
                  <span className="detail-icon">💧</span>
                  <span className="detail-value">{weather.humidity ?? '--'}%</span>
                </div>
                <div className="weather-detail-item">
                  <span className="detail-icon">🌧️</span>
                  <span className="detail-value">{weather.precipitation ?? '--'}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="weather-loading">{i18n.language === 'nl' ? 'Laden...' : 'Loading...'}</div>
          )}
        </div>
        
        {/* Loxone Home Stats */}
        {loxoneAvailable && (
          <div className="sidebar-section loxone-widget" onClick={() => onNavigate && onNavigate('home')}>
            <h3 className="sidebar-title">🏠 {i18n.language === 'nl' ? 'Huis' : 'Home'}</h3>
            <div className="loxone-stats-grid">
              {/* Energy */}
              {energyData && energyData.currentUsage !== null && (
                <div className="loxone-stat-card">
                  <span className="loxone-stat-icon">⚡</span>
                  <div className="loxone-stat-info">
                    <span className="loxone-stat-value">{(energyData.currentUsage * 1000).toFixed(0)}W</span>
                    <span className="loxone-stat-label">{i18n.language === 'nl' ? 'Verbruik' : 'Usage'}</span>
                  </div>
                </div>
              )}
              {/* Temperature sensors */}
              {sensorsData?.filter(s => s.type === 'temperature').slice(0, 2).map((sensor, idx) => (
                <div key={`temp-${idx}`} className="loxone-stat-card">
                  <span className="loxone-stat-icon">🌡️</span>
                  <div className="loxone-stat-info">
                    <span className="loxone-stat-value">{sensor.value.toFixed(1)}°C</span>
                    <span className="loxone-stat-label">{sensor.name || (i18n.language === 'nl' ? 'Temperatuur' : 'Temp')}</span>
                  </div>
                </div>
              ))}
              {/* Humidity */}
              {sensorsData?.find(s => s.type === 'humidity') && (
                <div className="loxone-stat-card">
                  <span className="loxone-stat-icon">💧</span>
                  <div className="loxone-stat-info">
                    <span className="loxone-stat-value">{sensorsData.find(s => s.type === 'humidity').value.toFixed(0)}%</span>
                    <span className="loxone-stat-label">{i18n.language === 'nl' ? 'Luchtvochtigheid' : 'Humidity'}</span>
                  </div>
                </div>
              )}
              {/* Solar production if available */}
              {energyData && energyData.solarProduction !== null && energyData.solarProduction !== undefined && (
                <div className="loxone-stat-card solar">
                  <span className="loxone-stat-icon">☀️</span>
                  <div className="loxone-stat-info">
                    <span className="loxone-stat-value">{(energyData.solarProduction * 1000).toFixed(0)}W</span>
                    <span className="loxone-stat-label">{i18n.language === 'nl' ? 'Zonne-energie' : 'Solar'}</span>
                  </div>
                </div>
              )}
              {/* Grid import/export */}
              {energyData && energyData.gridImport !== null && energyData.gridImport !== undefined && (
                <div className={`loxone-stat-card ${energyData.gridImport < 0 ? 'exporting' : ''}`}>
                  <span className="loxone-stat-icon">{energyData.gridImport < 0 ? '📤' : '📥'}</span>
                  <div className="loxone-stat-info">
                    <span className="loxone-stat-value">{Math.abs(energyData.gridImport * 1000).toFixed(0)}W</span>
                    <span className="loxone-stat-label">{energyData.gridImport < 0 ? (i18n.language === 'nl' ? 'Teruglevering' : 'Export') : (i18n.language === 'nl' ? 'Netafname' : 'Import')}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="loxone-tap-hint">{i18n.language === 'nl' ? 'Tik voor meer →' : 'Tap for more →'}</div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default BriefingPage;
