import React, { useState, useEffect } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useLoxone } from '../context/LoxoneContext';
import './EventModal.css';

const EventModal = ({ event, onClose }) => {
  const { createEvent, updateEvent, deleteEvent } = useCalendar();
  const { rooms, users } = useLoxone();

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    calendar: 'Personal',
    attendees: [],
    automation: {
      room: '',
      temperature: '',
      musicPreset: '',
      tempAccess: false
    }
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location || '',
        calendar: event.calendar,
        attendees: event.attendees || [],
        automation: event.automation || {
          room: '',
          temperature: '',
          musicPreset: '',
          tempAccess: false
        }
      });
    } else {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: today }));
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('automation.')) {
      const automationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        automation: {
          ...prev.automation,
          [automationField]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.date || !formData.time) {
      alert('Please fill in all required fields');
      return;
    }

    const eventData = {
      ...formData,
      // Only include automation if at least one field is set
      automation: (formData.automation.room || formData.automation.temperature || 
                   formData.automation.musicPreset || formData.automation.tempAccess)
        ? formData.automation
        : null
    };

    if (event) {
      updateEvent(event.id, eventData);
    } else {
      createEvent(eventData);
    }
    
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEvent(event.id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? 'Edit Event' : 'New Event'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3 className="form-section-title">Event Details</h3>
            
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Event title"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="time">Time *</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Event location"
              />
            </div>

            <div className="form-group">
              <label htmlFor="calendar">Calendar *</label>
              <select
                id="calendar"
                name="calendar"
                value={formData.calendar}
                onChange={handleChange}
                required
              >
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Family">Family</option>
                <option value="Social">Social</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">👥 Attendees</h3>
            
            <div className="form-group">
              <label>Family Members</label>
              <div className="checkbox-list">
                {users.map(user => (
                  <label key={user.uuid} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.attendees.includes(user.email)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            attendees: [...prev.attendees, user.email]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            attendees: prev.attendees.filter(email => email !== user.email)
                          }));
                        }
                      }}
                    />
                    <span>{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">🏠 Home Automation</h3>
            
            <div className="form-group">
              <label htmlFor="automation.room">Control Room</label>
              <select
                id="automation.room"
                name="automation.room"
                value={formData.automation.room}
                onChange={handleChange}
              >
                <option value="">None</option>
                {rooms.map(room => (
                  <option key={room.uuid} value={room.name}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="automation.temperature">Set Temperature</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  id="automation.temperature"
                  name="automation.temperature"
                  value={formData.automation.temperature}
                  onChange={handleChange}
                  placeholder="21"
                  min="15"
                  max="30"
                  step="0.5"
                />
                <span className="unit-label">°C</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="automation.musicPreset">Music Preset</label>
              <select
                id="automation.musicPreset"
                name="automation.musicPreset"
                value={formData.automation.musicPreset}
                onChange={handleChange}
              >
                <option value="">None</option>
                <option value="Morning">Morning</option>
                <option value="Focus">Focus</option>
                <option value="Relaxing">Relaxing</option>
                <option value="Party">Party</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="automation.tempAccess"
                  checked={formData.automation.tempAccess}
                  onChange={handleChange}
                />
                <span>Grant temporary access to guests</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            {event && (
              <button 
                type="button" 
                className="delete-btn" 
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {event ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
