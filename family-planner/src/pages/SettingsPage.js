import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './SettingsPage.css';

function getApiBaseUrl() {
  const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin, port, protocol } = window.location;

    if (port === '3000') {
      return `${protocol}//${hostname}:3002`;
    }

    return origin;
  }

  return 'http://localhost:3002';
}

const API_BASE = getApiBaseUrl();

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    server: { port: '', nodeEnv: '', databasePath: '', corsOrigin: '' },
    calendarSource: 'apple',
    caldav: { serverUrl: '', username: '', password: '', syncInterval: '' },
    googleTasks: { clientId: '', clientSecret: '', redirectUri: '', taskListName: '', syncInterval: '' },
    googleCalendar: { enabled: false, calendarId: 'primary' },
    loxone: { serverUrl: '', username: '', password: '' }
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setFormData({
          server: {
            port: data.server?.port || '3002',
            nodeEnv: data.server?.nodeEnv || 'development',
            databasePath: data.server?.databasePath || './data/family-planner.db',
            corsOrigin: data.server?.corsOrigin || 'http://localhost:3000'
          },
          calendarSource: data.calendarSource || 'apple',
          caldav: {
            serverUrl: data.caldav?.serverUrl || '',
            username: data.caldav?.username || '',
            password: data.caldav?.hasPassword ? '********' : '',
            syncInterval: data.caldav?.syncInterval || '5'
          },
          googleTasks: {
            clientId: data.googleTasks?.clientId || '',
            clientSecret: data.googleTasks?.hasClientSecret ? '********' : '',
            redirectUri: data.googleTasks?.redirectUri || '',
            taskListName: data.googleTasks?.taskListName || 'Shopping List',
            syncInterval: data.googleTasks?.syncInterval || '30'
          },
          googleCalendar: {
            enabled: data.googleCalendar?.enabled || false,
            calendarId: data.googleCalendar?.calendarId || 'primary'
          },
          loxone: {
            serverUrl: data.loxone?.serverUrl || '',
            username: data.loxone?.username || '',
            password: data.loxone?.hasPassword ? '********' : ''
          }
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: '✓ Instellingen opgeslagen! Herstart de server om wijzigingen toe te passen.' 
        });
        setEditMode(false);
        loadConfig();
      } else {
        throw new Error('Opslaan mislukt');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const handleGoogleAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/google/auth-url`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank', 'width=600,height=700');
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleGoogleCalendarAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/google/calendar/auth-url`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank', 'width=600,height=700');
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleGoogleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/google/sync`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setMessage({ 
          type: 'success', 
          text: `✓ Sync voltooid: ${data.created || 0} nieuw, ${data.updated || 0} bijgewerkt` 
        });
      } else {
        throw new Error('Sync mislukt');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading-state">Laden...</div>
      </div>
    );
  }

  const currentLang = i18n.language || 'nl';

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="header-icon">⚙️</div>
        <div className="header-text">
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>
        <button 
          className={`edit-toggle ${editMode ? 'active' : ''}`}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? '✕ Annuleren' : '✏️ Bewerken'}
        </button>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      <div className="settings-grid">
        {/* Language Card */}
        <div className="settings-card">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <h2>{t('settings.language')}</h2>
          </div>
          <div className="card-content">
            <div className="language-selector">
              <button 
                className={`lang-button ${currentLang === 'nl' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('nl')}
              >
                <span className="flag">🇳🇱</span>
                <span>Nederlands</span>
              </button>
              <button 
                className={`lang-button ${currentLang === 'en' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                <span className="flag">🇬🇧</span>
                <span>English</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Source Card */}
        <div className="settings-card">
          <div className="card-header">
            <span className="card-icon">📆</span>
            <h2>Agenda Bron</h2>
          </div>
          <div className="card-content">
            <p className="card-description">Kies welke agenda's je wilt gebruiken voor het ophalen van evenementen.</p>
            <div className="calendar-source-selector">
              <button 
                className={`source-button ${formData.calendarSource === 'apple' ? 'active' : ''}`}
                onClick={() => editMode && setFormData(prev => ({ ...prev, calendarSource: 'apple' }))}
                disabled={!editMode}
              >
                <span className="icon">🍎</span>
                <span className="label">Apple Agenda</span>
                <span className="sublabel">iCloud / CalDAV</span>
              </button>
              <button 
                className={`source-button ${formData.calendarSource === 'google' ? 'active' : ''}`}
                onClick={() => editMode && setFormData(prev => ({ ...prev, calendarSource: 'google' }))}
                disabled={!editMode}
              >
                <span className="icon">📅</span>
                <span className="label">Google Agenda</span>
                <span className="sublabel">Gmail account</span>
              </button>
              <button 
                className={`source-button ${formData.calendarSource === 'both' ? 'active' : ''}`}
                onClick={() => editMode && setFormData(prev => ({ ...prev, calendarSource: 'both' }))}
                disabled={!editMode}
              >
                <span className="icon">🔗</span>
                <span className="label">Beide</span>
                <span className="sublabel">Gecombineerd</span>
              </button>
            </div>
          </div>
        </div>

        {/* Google Calendar Card */}
        <div className="settings-card">
          <div className="card-header">
            <span className="card-icon">📅</span>
            <h2>Google Agenda</h2>
            <div className={`status-pill ${config?.googleCalendar?.connected ? 'connected' : 'disconnected'}`}>
              {config?.googleCalendar?.connected ? '✓ Verbonden' : '✗ Niet verbonden'}
            </div>
          </div>
          <div className="card-content">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={formData.googleCalendar.enabled}
                  onChange={(e) => handleInputChange('googleCalendar', 'enabled', e.target.checked)}
                  disabled={!editMode}
                />
                <span>Google Agenda inschakelen</span>
              </label>
            </div>
            <div className="form-group">
              <label>Kalender ID</label>
              <input 
                type="text" 
                value={formData.googleCalendar.calendarId}
                onChange={(e) => handleInputChange('googleCalendar', 'calendarId', e.target.value)}
                disabled={!editMode}
                placeholder="primary"
              />
              <span className="help-text">Gebruik 'primary' voor je standaard agenda</span>
            </div>
            {!config?.googleCalendar?.connected && formData.googleCalendar.enabled && (
              <button className="action-button connect" onClick={handleGoogleCalendarAuth}>
                🔗 Verbinden met Google Agenda
              </button>
            )}
            {config?.googleCalendar?.connected && (
              <div className="info-row success">
                <span className="label">✓ Verbonden met Google Agenda</span>
              </div>
            )}
          </div>
        </div>

        {/* Server Card */}
        <div className="settings-card">
          <div className="card-header">
            <span className="card-icon">🖥️</span>
            <h2>Server</h2>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Poort</label>
              <input 
                type="text" 
                value={formData.server.port}
                onChange={(e) => handleInputChange('server', 'port', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="form-group">
              <label>Database pad</label>
              <input 
                type="text" 
                value={formData.server.databasePath}
                onChange={(e) => handleInputChange('server', 'databasePath', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="form-group">
              <label>CORS Origin</label>
              <input 
                type="text" 
                value={formData.server.corsOrigin}
                onChange={(e) => handleInputChange('server', 'corsOrigin', e.target.value)}
                disabled={!editMode}
              />
            </div>
          </div>
        </div>

        {/* Google Tasks Card */}
        <div className="settings-card">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <h2>Google Tasks</h2>
            <div className={`status-pill ${config?.googleTasks?.connected ? 'connected' : 'disconnected'}`}>
              {config?.googleTasks?.connected ? '✓ Verbonden' : '✗ Niet verbonden'}
            </div>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Client ID</label>
              <input 
                type="text" 
                value={formData.googleTasks.clientId}
                onChange={(e) => handleInputChange('googleTasks', 'clientId', e.target.value)}
                disabled={!editMode}
                placeholder="xxx.apps.googleusercontent.com"
              />
            </div>
            <div className="form-group">
              <label>Client Secret</label>
              <input 
                type="password" 
                value={formData.googleTasks.clientSecret}
                onChange={(e) => handleInputChange('googleTasks', 'clientSecret', e.target.value)}
                disabled={!editMode}
                placeholder="GOCSPX-..."
              />
            </div>
            <div className="form-group">
              <label>Redirect URI</label>
              <input 
                type="text" 
                value={formData.googleTasks.redirectUri}
                onChange={(e) => handleInputChange('googleTasks', 'redirectUri', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="form-group">
              <label>Task List Naam</label>
              <input 
                type="text" 
                value={formData.googleTasks.taskListName}
                onChange={(e) => handleInputChange('googleTasks', 'taskListName', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="form-group">
              <label>Sync Interval (seconden)</label>
              <input 
                type="number" 
                value={formData.googleTasks.syncInterval}
                onChange={(e) => handleInputChange('googleTasks', 'syncInterval', e.target.value)}
                disabled={!editMode}
              />
            </div>
            {config?.googleTasks?.connected ? (
              <button 
                className="action-button sync"
                onClick={handleGoogleSync}
                disabled={syncing}
              >
                {syncing ? '⏳ Bezig...' : '🔄 Nu synchroniseren'}
              </button>
            ) : (
              <button className="action-button connect" onClick={handleGoogleAuth}>
                🔗 Verbinden met Google
              </button>
            )}
          </div>
        </div>

        {/* CalDAV Card */}
        <div className="settings-card">
          <div className="card-header">
            <span className="card-icon">📅</span>
            <h2>iCloud Agenda (CalDAV)</h2>
            <div className={`status-pill ${config?.caldav?.connected ? 'connected' : 'disconnected'}`}>
              {config?.caldav?.connected ? '✓ Verbonden' : '✗ Niet verbonden'}
            </div>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Server URL</label>
              <input 
                type="text" 
                value={formData.caldav.serverUrl}
                onChange={(e) => handleInputChange('caldav', 'serverUrl', e.target.value)}
                disabled={!editMode}
                placeholder="https://caldav.icloud.com"
              />
            </div>
            <div className="form-group">
              <label>Gebruikersnaam</label>
              <input 
                type="text" 
                value={formData.caldav.username}
                onChange={(e) => handleInputChange('caldav', 'username', e.target.value)}
                disabled={!editMode}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label>App-wachtwoord</label>
              <input 
                type="password" 
                value={formData.caldav.password}
                onChange={(e) => handleInputChange('caldav', 'password', e.target.value)}
                disabled={!editMode}
                placeholder="xxxx-xxxx-xxxx-xxxx"
              />
            </div>
            <div className="form-group">
              <label>Sync Interval (minuten)</label>
              <input 
                type="number" 
                value={formData.caldav.syncInterval}
                onChange={(e) => handleInputChange('caldav', 'syncInterval', e.target.value)}
                disabled={!editMode}
              />
            </div>
            {config?.caldav?.connected && (
              <div className="info-row">
                <span className="label">Agenda's gevonden</span>
                <span className="value">{config.caldav.calendarsCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Loxone Card */}
        <div className="settings-card">
          <div className="card-header">
            <span className="card-icon">🏠</span>
            <h2>Loxone</h2>
            <div className={`status-pill ${config?.loxone?.connected ? 'connected' : 'disconnected'}`}>
              {config?.loxone?.connected ? '✓ Verbonden' : '✗ Niet verbonden'}
            </div>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Server URL</label>
              <input 
                type="text" 
                value={formData.loxone.serverUrl}
                onChange={(e) => handleInputChange('loxone', 'serverUrl', e.target.value)}
                disabled={!editMode}
                placeholder="https://192.168.1.xxx"
              />
            </div>
            <div className="form-group">
              <label>Gebruikersnaam</label>
              <input 
                type="text" 
                value={formData.loxone.username}
                onChange={(e) => handleInputChange('loxone', 'username', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="form-group">
              <label>Wachtwoord</label>
              <input 
                type="password" 
                value={formData.loxone.password}
                onChange={(e) => handleInputChange('loxone', 'password', e.target.value)}
                disabled={!editMode}
              />
            </div>
          </div>
        </div>
      </div>

      {editMode && (
        <div className="save-bar">
          <button 
            className="save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⏳ Opslaan...' : '💾 Alle instellingen opslaan'}
          </button>
        </div>
      )}

      <div className="settings-footer">
        <p className="footer-hint">
          💡 Na het opslaan moet de server herstart worden om de wijzigingen toe te passen
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
