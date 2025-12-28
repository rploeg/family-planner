import React, { useState, useEffect } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useMeals } from '../context/MealsContext';
import { useLoxone } from '../context/LoxoneContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import MealPlanModal from './MealPlanModal';
import './WeekTimeline.css';

const WeekTimeline = ({ onEventClick }) => {
  const { events } = useCalendar();
  const { getMealsForDate, deleteMeal } = useMeals();
  const { users } = useLoxone();
  const { i18n } = useTranslation();
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week
  const [weekDays, setWeekDays] = useState([]);
  const [mealModalDate, setMealModalDate] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [tasksWithDueDate, setTasksWithDueDate] = useState([]);

  useEffect(() => {
    generateWeekDays();
  }, [selectedWeek]);

  useEffect(() => {
    loadTasksWithDueDate();
  }, []);

  const loadTasksWithDueDate = async () => {
    try {
      const tasks = await api.getTasksWithDueDate();
      setTasksWithDueDate(tasks);
    } catch (error) {
      console.error('Failed to load tasks with due dates:', error);
    }
  };

  const generateWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Get to Monday
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + mondayOffset + (selectedWeek * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    setWeekDays(days);
  };

  const getEventsForDay = (date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      // Include event if it overlaps with this day at all
      return eventStart <= dayEnd && eventEnd >= dayStart;
    }).map(event => adjustEventDisplayForDay(event, dayStart));
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

  const getMealsForDay = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return getMealsForDate(dateStr);
  };

  const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTasksForDay = (date) => {
    const dateStr = getDateString(date);
    return tasksWithDueDate.filter(task => {
      if (!task.dueDate || task.checked) return false;
      return task.dueDate === dateStr;
    });
  };

  const getEventsByPerson = (dayEvents) => {
    const byPerson = {};
    
    dayEvents.forEach(event => {
      if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(email => {
          const user = users.find(u => u.email === email);
          const name = user ? user.firstName : email.split('@')[0];
          if (!byPerson[name]) {
            byPerson[name] = [];
          }
          byPerson[name].push(event);
        });
      } else {
        // Events without attendees go to "General"
        if (!byPerson['General']) {
          byPerson['General'] = [];
        }
        byPerson['General'].push(event);
      }
    });

    return byPerson;
  };

  const getUserColor = (name) => {
    const colors = [
      '#8BC34A', // Green (Loxone)
      '#2196F3', // Blue
      '#FF5722', // Orange
      '#9C27B0', // Purple
      '#FFC107', // Amber
      '#00BCD4', // Cyan
      '#E91E63', // Pink
      '#4CAF50', // Light Green
    ];
    const index = name?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

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

  const formatDate = (date) => {
    const daysNl = ['ZON', 'MAA', 'DIN', 'WOE', 'DON', 'VRI', 'ZAT'];
    const daysEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = i18n.language === 'nl' ? daysNl : daysEn;
    return {
      dayName: days[date.getDay()],
      dayNum: date.getDate(),
      month: months[date.getMonth()]
    };
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const previousWeek = () => setSelectedWeek(selectedWeek - 1);
  const nextWeek = () => setSelectedWeek(selectedWeek + 1);
  const currentWeek = () => setSelectedWeek(0);

  const openMealModal = (date, meal = null) => {
    setMealModalDate(getDateString(date));
    setEditingMeal(meal);
  };

  const closeMealModal = () => {
    setMealModalDate(null);
    setEditingMeal(null);
  };

  const getMealIcon = (type) => {
    const icons = {
      breakfast: '🍳',
      lunch: '🥪',
      dinner: '🍽️',
      snack: '🍪'
    };
    return icons[type] || '🍽️';
  };

  return (
    <div className="week-timeline">
      <div className="timeline-header">
        <h3 className="timeline-title">Week Schedule</h3>
        <div className="timeline-controls">
          <button className="week-nav-btn" onClick={previousWeek}>‹</button>
          <button className="week-current-btn" onClick={currentWeek}>
            {selectedWeek === 0 ? 'This Week' : `Week ${selectedWeek > 0 ? '+' : ''}${selectedWeek}`}
          </button>
          <button className="week-nav-btn" onClick={nextWeek}>›</button>
        </div>
      </div>

      <div className="timeline-grid">
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const dayMeals = getMealsForDay(day);
          const dayTasks = getTasksForDay(day);
          const eventsByPerson = getEventsByPerson(dayEvents);
          const dateInfo = formatDate(day);
          const today = isToday(day);

          return (
            <div key={index} className={`timeline-day ${today ? 'today' : ''}`}>
              <div className="day-header">
                <span className="day-name">{dateInfo.dayName}</span>
                <span className="day-number">{dateInfo.dayNum}</span>
                <span className="day-month">{dateInfo.month}</span>
              </div>

              {/* Meals Section */}
              <div className="day-meals">
                {dayMeals.length > 0 ? (
                  dayMeals.map(meal => (
                    <div 
                      key={meal.id} 
                      className="meal-item"
                      onClick={() => openMealModal(day, meal)}
                    >
                      <span className="meal-icon">{getMealIcon(meal.type)}</span>
                      <span className="meal-title">{meal.title}</span>
                    </div>
                  ))
                ) : (
                  <button 
                    className="add-meal-btn"
                    onClick={() => openMealModal(day)}
                  >
                    + {i18n.language === 'nl' ? 'Maaltijd' : 'Meal'}
                  </button>
                )}
              </div>

              {/* Tasks Section */}
              {dayTasks.length > 0 && (
                <div className="day-tasks">
                  {dayTasks.map(task => (
                    <div key={task.id} className="task-item">
                      <span className="task-icon">✓</span>
                      <span className="task-title">{task.text}</span>
                      <span className="task-list">{task.listName}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="day-events">
                {dayEvents.length === 0 ? (
                  <div className="no-events">—</div>
                ) : (
                  Object.entries(eventsByPerson).map(([person, personEvents]) => (
                    <div key={person} className="person-events">
                      <div 
                        className="person-label"
                        style={{ backgroundColor: getUserColor(person) }}
                      >
                        {person}
                      </div>
                      {personEvents.map(event => (
                        <div
                          key={event.id}
                          className="timeline-event"
                          onClick={() => onEventClick(event)}
                          style={{ borderLeftColor: getCalendarColor(event.calendar) }}
                        >
                          <div className="event-time-small">
                            {event.allDay ? (i18n.language === 'nl' ? 'Hele dag' : 'All Day') : event.time}
                          </div>
                          <div className="event-title-small">{event.title}</div>
                          {event.location && (
                            <div className="event-location-small">📍 {event.location}</div>
                          )}
                          {event.automation && (event.automation.room || event.automation.temperature) && (
                            <div className="event-automation-small">🏠</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {mealModalDate && (
        <MealPlanModal
          date={mealModalDate}
          existingMeal={editingMeal}
          onClose={closeMealModal}
        />
      )}
    </div>
  );
};

export default WeekTimeline;
