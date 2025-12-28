import React, { useState, useEffect } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useMeals } from '../context/MealsContext';
import { useTranslation } from 'react-i18next';
import weatherService from '../services/weatherService';
import api from '../services/api';
import EventCard from '../components/EventCard';
import SmartAlert from '../components/SmartAlert';
import './BriefingPage.css';

const BriefingPage = ({ allAlerts = [], dismissedAlertIds = [] }) => {
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

  // Get comfort level for temperature
  const getTemperatureComfort = (temp) => {
    if (temp < 19) return { level: 'cold', color: '#4FC3F7', icon: '🥶' };
    if (temp > 22) return { level: 'warm', color: '#FF9800', icon: '🥵' };
    return { level: 'comfortable', color: '#8BC34A', icon: '😊' };
  };

  // Get humidity status
  const getHumidityStatus = (humidity) => {
    if (humidity < 30) return { status: 'dry', color: '#FF9800', warning: true };
    if (humidity > 60) return { status: 'humid', color: '#FF9800', warning: true };
    return { status: 'good', color: '#8BC34A', warning: false };
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

  const powerTrend = getPowerTrend();

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

      {/* Weather Warning for Outdoor Events
      <section className="briefing-section summary-section">
        <div className="summary-card">
          <div className="summary-greeting">
            <span className="summary-greeting-text">
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return i18n.language === 'nl' ? 'Goedemorgen' : 'Good Morning';
                if (hour < 18) return i18n.language === 'nl' ? 'Goedemiddag' : 'Good Afternoon';
                return i18n.language === 'nl' ? 'Goedenavond' : 'Good Evening';
              })()}
            </span>
          </div>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-icon">📅</span>
              <span className="stat-value">{todayEvents.length}</span>
              <span className="stat-label">{i18n.language === 'nl' ? 'Events' : 'Events'}</span>
            </div>
            {todayTasks.length > 0 && (
              <div className="summary-stat">
                <span className="stat-icon">✓</span>
                <span className="stat-value">{todayTasks.length}</span>
                <span className="stat-label">{i18n.language === 'nl' ? 'Taken' : 'Tasks'}</span>
              </div>
            )}
            {energyData && (
              <div className="summary-stat">
                <span className="stat-icon">⚡</span>
                <span className="stat-value">{(energyData.currentUsage * 1000).toFixed(0)}W</span>
                <span className="stat-label">Power</span>
              </div>
            )}
            {sensorsData && sensorsData.find(s => s.type === 'temperature') && (
              <div className="summary-stat">
                <span className="stat-icon">🌡️</span>
                <span className="stat-value">{sensorsData.find(s => s.type === 'temperature').value.toFixed(1)}°</span>
                <span className="stat-label">Temp</span>
              </div>
            )}
          </div>
        </div>
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
                  <div className="card-header">
                    <div className="card-label">{i18n.language === 'nl' ? 'Huidig Verbruik' : 'Current Usage'}</div>
                    {powerTrend && (
                      <span className={`trend-indicator trend-${powerTrend}`}>
                        {powerTrend === 'up' ? '↑' : powerTrend === 'down' ? '↓' : '→'}
                      </span>
                    )}
                  </div>
                  <div className="card-value">{(energyData.currentUsage * 1000).toFixed(0)} W</div>
                  <div className="card-sublabel">
                    <span>P1 Meter</span>
                    <span className="card-cost">≈ €{(energyData.currentUsage * 0.35).toFixed(2)}/h</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Temperature Sensor */}
            {sensorsData && sensorsData.find(s => s.type === 'temperature') && (() => {
              const tempSensor = sensorsData.find(s => s.type === 'temperature');
              const comfort = getTemperatureComfort(tempSensor.value);
              return (
                <div className="loxone-live-card temp-card" style={{ borderColor: comfort.color }}>
                  <div className="card-icon">{comfort.icon}</div>
                  <div className="card-content">
                    <div className="card-label">{i18n.language === 'nl' ? 'Temperatuur' : 'Temperature'}</div>
                    <div className="card-value" style={{ color: comfort.color }}>{tempSensor.value.toFixed(1)}°C</div>
                    <div className="card-sublabel">
                      <span>{tempSensor.name}</span>
                      <span className="comfort-badge" style={{ background: comfort.color }}>
                        {comfort.level === 'cold' ? (i18n.language === 'nl' ? 'Koud' : 'Cold') : 
                         comfort.level === 'warm' ? (i18n.language === 'nl' ? 'Warm' : 'Warm') :
                         (i18n.language === 'nl' ? 'Comfortabel' : 'Comfortable')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Humidity Sensor */}
            {sensorsData && sensorsData.find(s => s.type === 'humidity') && (() => {
              const humiditySensor = sensorsData.find(s => s.type === 'humidity');
              const status = getHumidityStatus(humiditySensor.value);
              return (
                <div className="loxone-live-card humidity-card" style={{ borderColor: status.color }}>
                  <div className="card-icon">💧</div>
                  <div className="card-content">
                    <div className="card-label">{i18n.language === 'nl' ? 'Luchtvochtigheid' : 'Humidity'}</div>
                    <div className="card-value" style={{ color: status.color }}>{humiditySensor.value.toFixed(0)}%</div>
                    <div className="card-sublabel">
                      <span>{humiditySensor.name}</span>
                      {status.warning && (
                        <span className="comfort-badge" style={{ background: status.color }}>
                          {status.status === 'dry' ? (i18n.language === 'nl' ? 'Droog' : 'Dry') : 
                           (i18n.language === 'nl' ? 'Vochtig' : 'Humid')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            
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
    </div>
  );
};

export default BriefingPage;
