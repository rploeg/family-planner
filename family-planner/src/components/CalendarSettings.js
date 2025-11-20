import React, { useState, useEffect } from 'react';
import './CalendarSettings.css';

const CalendarSettings = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [syncEnabled, setSyncEnabled] = useState(true); // CalDAV always enabled via backend
  
  // Loxone settings
  const [loxoneServer, setLoxoneServer] = useState('');
  const [loxoneUsername, setLoxoneUsername] = useState('');
  const [loxonePassword, setLoxonePassword] = useState('');
  const [loxoneSaved, setLoxoneSaved] = useState(false);

  useEffect(() => {
    // Load Loxone settings
    const savedServer = localStorage.getItem('loxone_server') || '';
    const savedUsername = localStorage.getItem('loxone_username') || '';
    const savedPassword = localStorage.getItem('loxone_password') || '';
    setLoxoneServer(savedServer);
    setLoxoneUsername(savedUsername);
    setLoxonePassword(savedPassword);
    setLoxoneSaved(savedServer !== '');
  }, []);

  const handleSyncToggle = (e) => {
    // CalDAV sync is always enabled via backend, this is just for UI
    setSyncEnabled(e.target.checked);
  };
  
  const handleSaveLoxone = (e) => {
    e.preventDefault();
    localStorage.setItem('loxone_server', loxoneServer);
    localStorage.setItem('loxone_username', loxoneUsername);
    localStorage.setItem('loxone_password', loxonePassword);
    setLoxoneSaved(true);
    setTimeout(() => setLoxoneSaved(false), 3000);
  };
  
  const handleClearLoxone = () => {
    if (window.confirm('Clear Loxone configuration?')) {
      localStorage.removeItem('loxone_server');
      localStorage.removeItem('loxone_username');
      localStorage.removeItem('loxone_password');
      setLoxoneServer('');
      setLoxoneUsername('');
      setLoxonePassword('');
      setLoxoneSaved(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            📅 Calendar
          </button>
          <button 
            className={`tab-btn ${activeTab === 'loxone' ? 'active' : ''}`}
            onClick={() => setActiveTab('loxone')}
          >
            🏠 Loxone
          </button>
        </div>

        <div className="modal-form">
          {activeTab === 'calendar' && (
            <div className="form-section">
              <h3 className="form-section-title">📅 Calendar Sync Status</h3>
              
              <div className="success-box">
                ✅ CalDAV calendar sync is active via backend server
              </div>

              <div className="sync-info">
                <h4>Sync Features:</h4>
                <ul>
                  <li>✓ Import events from iCloud Calendar (CalDAV)</li>
                  <li>✓ Real-time calendar synchronization</li>
                  <li>✓ Support for all-day and recurring events</li>
                  <li>✓ Multiple calendar support</li>
                  <li>✓ Persistent storage in SQLite database</li>
                </ul>
              </div>

              <div className="info-box">
                <p><strong>💡 Configuration:</strong></p>
                <p>Calendar credentials are configured in the backend server's <code>.env</code> file. Contact your system administrator to update CalDAV settings.</p>
              </div>

              <div className="form-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={syncEnabled}
                    onChange={handleSyncToggle}
                  />
                  <span>Enable calendar display</span>
                </label>
                <p className="help-text">
                  Toggle calendar events visibility in the app
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'loxone' && (
            <div className="form-section">
              <h3 className="form-section-title">🏠 Loxone Configuration</h3>
              
              {loxoneSaved && (
                <div className="success-box">
                  Loxone settings saved successfully!
                </div>
              )}
              
              <form onSubmit={handleSaveLoxone}>
                <div className="form-group">
                  <label htmlFor="loxoneServer">Miniserver Address</label>
                  <input
                    type="text"
                    id="loxoneServer"
                    value={loxoneServer}
                    onChange={(e) => setLoxoneServer(e.target.value)}
                    placeholder="http://192.168.1.100:8080"
                    required
                  />
                  <small>Full URL including http:// and port</small>
                </div>

                <div className="form-group">
                  <label htmlFor="loxoneUsername">Username</label>
                  <input
                    type="text"
                    id="loxoneUsername"
                    value={loxoneUsername}
                    onChange={(e) => setLoxoneUsername(e.target.value)}
                    placeholder="admin"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="loxonePassword">Password</label>
                  <input
                    type="password"
                    id="loxonePassword"
                    value={loxonePassword}
                    onChange={(e) => setLoxonePassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="button-group">
                  <button type="submit" className="connect-btn">
                    Save Configuration
                  </button>
                  {loxoneServer && (
                    <button 
                      type="button" 
                      className="disconnect-btn"
                      onClick={handleClearLoxone}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
              
              <div className="info-box">
                <p><strong>ℹ️ Information:</strong></p>
                <ul>
                  <li>Configure your Loxone Miniserver connection</li>
                  <li>Credentials are stored locally in your browser</li>
                  <li>Used for room automation and access control</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarSettings;
