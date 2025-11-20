import React, { useState, useEffect } from 'react';
import { useLoxone } from '../context/LoxoneContext';
import './FamilyModal.css';

const FamilyModal = ({ user, onClose }) => {
  const { addUser, updateUser, deleteUser } = useLoxone();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    nfcTag: '',
    admin: false,
    status: 'away',
    location: '',
    permissions: {
      access: 'Full',
      schedule: 'Always'
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        nfcTag: user.nfcTag,
        admin: user.admin || false,
        status: user.status || 'away',
        location: user.location || '',
        permissions: user.permissions || {
          access: 'Full',
          schedule: 'Always'
        }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('permissions.')) {
      const permissionField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [permissionField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const generateNFCTag = () => {
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    setFormData(prev => ({
      ...prev,
      nfcTag: `NFC-${random}`
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.nfcTag) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    const userData = {
      ...formData,
      lastSeen: user?.lastSeen || new Date().toLocaleString()
    };

    if (user) {
      updateUser(user.uuid, userData);
    } else {
      addUser(userData);
    }
    
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove ${user.name} from the family?`)) {
      deleteUser(user.uuid);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{user ? 'Edit Family Member' : 'Add Family Member'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3 className="form-section-title">Personal Information</h3>
            
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="nfcTag">NFC Tag ID *</label>
              <div className="input-with-button">
                <input
                  type="text"
                  id="nfcTag"
                  name="nfcTag"
                  value={formData.nfcTag}
                  onChange={handleChange}
                  placeholder="NFC-12345678"
                  required
                />
                <button 
                  type="button" 
                  className="generate-btn"
                  onClick={generateNFCTag}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Status & Location</h3>
            
            <div className="form-group">
              <label htmlFor="status">Current Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="home">🏠 Home</option>
                <option value="away">🚪 Away</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Living Room, Office, etc."
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Permissions & Access</h3>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="admin"
                  checked={formData.admin}
                  onChange={handleChange}
                />
                <span>👑 Administrator privileges</span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="permissions.access">Access Level</label>
              <select
                id="permissions.access"
                name="permissions.access"
                value={formData.permissions.access}
                onChange={handleChange}
              >
                <option value="Full">Full Access</option>
                <option value="Limited">Limited Access</option>
                <option value="Guest">Guest Access</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="permissions.schedule">Access Schedule</label>
              <select
                id="permissions.schedule"
                name="permissions.schedule"
                value={formData.permissions.schedule}
                onChange={handleChange}
              >
                <option value="Always">Always</option>
                <option value="Weekdays">Weekdays Only</option>
                <option value="Weekends">Weekends Only</option>
                <option value="Custom">Custom Schedule</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            {user && (
              <button 
                type="button" 
                className="delete-btn" 
                onClick={handleDelete}
              >
                Remove
              </button>
            )}
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {user ? 'Update' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FamilyModal;
