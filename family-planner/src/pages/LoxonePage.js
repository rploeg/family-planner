import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import './LoxonePage.css';

const LoxonePage = () => {
  const { i18n } = useTranslation();
  const [loxoneAvailable, setLoxoneAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);  // Track if data has been fetched
  const [energyData, setEnergyData] = useState(null);
  const [sensorsData, setSensorsData] = useState([]);
  const [lightsData, setLightsData] = useState([]);
  const [roomsData, setRoomsData] = useState([]);
  const [activeView, setActiveView] = useState('rooms');
  const [energyTab, setEnergyTab] = useState('power');
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  const loadLoxoneData = useCallback(async () => {
    try {
      setLoading(true);
      const status = await api.getLoxoneStatus();
      setLoxoneAvailable(status.initialized);

      if (status.initialized) {
        const [rooms, energy, sensors, lights] = await Promise.all([
          api.getLoxoneRooms(),
          api.getLoxoneEnergy(),
          api.getLoxoneSensors(),
          api.getLoxoneLights()
        ]);
        
        // Ensure lights data has correct boolean isOn values
        const processedLights = Array.isArray(lights) ? lights.map(l => ({
          ...l,
          isOn: l.isOn === true  // Ensure boolean
        })) : [];
        
        setRoomsData(rooms || []);
        setEnergyData(energy);
        setSensorsData(sensors || []);
        setLightsData(processedLights);
        setDataLoaded(true);  // Mark data as loaded
      }
    } catch (error) {
      console.error('Failed to load Loxone data:', error);
      setLoxoneAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle real-time Loxone updates via WebSocket
  const handleLoxoneUpdate = useCallback((updates) => {
    console.log('Loxone real-time update:', updates);
    
    updates.forEach(update => {
      if (update.type === 'light') {
        setLightsData(prev => prev.map(light => 
          light.uuid === update.uuid 
            ? { ...light, isOn: update.isOn, activeMood: update.value }
            : light
        ));
      } else if (update.type === 'sensor') {
        setSensorsData(prev => prev.map(sensor =>
          sensor.uuid === update.uuid
            ? { ...sensor, value: update.value }
            : sensor
        ));
      }
    });
  }, []);

  useEffect(() => {
    loadLoxoneData();
    
    // Connect to WebSocket for real-time updates
    wsRef.current = api.connectWebSocket({
      onConnect: () => setWsConnected(true),
      onDisconnect: () => setWsConnected(false),
      onLoxoneUpdate: handleLoxoneUpdate
    });
    
    // Fallback polling every 30 seconds if WebSocket fails
    const interval = setInterval(loadLoxoneData, 30000);
    
    return () => {
      clearInterval(interval);
      api.disconnectWebSocket();
    };
  }, [loadLoxoneData, handleLoxoneUpdate]);

  // Get room data with sensors and lights combined
  const getRoomData = (roomName) => {
    const sensors = Array.isArray(sensorsData) ? sensorsData : [];
    const lights = Array.isArray(lightsData) ? lightsData : [];
    const rooms = Array.isArray(roomsData) ? roomsData : [];
    
    const tempSensor = sensors.find(s => s.type === 'temperature' && s.room === roomName);
    const humiditySensor = sensors.find(s => s.type === 'humidity' && s.room === roomName);
    const roomLight = lights.find(l => l.room === roomName);
    const roomInfo = rooms.find(r => r.room === roomName || r.name === roomName);
    
    return {
      temperature: tempSensor?.value ?? null,
      humidity: humiditySensor?.value ?? null,
      lightOn: roomLight?.isOn === true,  // Explicit boolean check
      lightName: roomLight?.name ?? null,
      lightUuid: roomLight?.uuid ?? null,  // Include UUID for control
      occupied: roomInfo?.occupied === true,
      mode: roomInfo?.mode ?? 1
    };
  };

  // Handle light toggle
  const handleLightToggle = async (uuid, currentlyOn) => {
    if (!uuid) return;
    
    try {
      // Optimistically update UI
      setLightsData(prev => prev.map(light => 
        light.uuid === uuid ? { ...light, isOn: !currentlyOn } : light
      ));
      
      // Send toggle command
      await api.toggleLoxoneLight(uuid, !currentlyOn);
      console.log(`[LoxonePage] Toggled light ${uuid} -> ${!currentlyOn}`);
    } catch (error) {
      console.error('[LoxonePage] Failed to toggle light:', error);
      // Revert on error
      setLightsData(prev => prev.map(light => 
        light.uuid === uuid ? { ...light, isOn: currentlyOn } : light
      ));
    }
  };

  // Get unique rooms
  const getUniqueRooms = () => {
    const roomSet = new Set();
    const sensors = Array.isArray(sensorsData) ? sensorsData : [];
    const lights = Array.isArray(lightsData) ? lightsData : [];
    const rooms = Array.isArray(roomsData) ? roomsData : [];
    
    sensors.forEach(s => s.room && roomSet.add(s.room));
    lights.forEach(l => l.room && roomSet.add(l.room));
    rooms.forEach(r => (r.room || r.name) && roomSet.add(r.room || r.name));
    
    return Array.from(roomSet).filter(r => r && r !== 'Unknown');
  };

  // Get comfort mode info
  const getComfortMode = (mode) => {
    const modes = {
      0: { label: i18n.language === 'nl' ? 'Eco' : 'Economy', icon: '🌙', color: '#69c0ff' },
      1: { label: 'Comfort', icon: '☀️', color: '#52c41a' },
      2: { label: i18n.language === 'nl' ? 'Bescherming' : 'Protection', icon: '��', color: '#faad14' },
      3: { label: i18n.language === 'nl' ? 'Handmatig' : 'Manual', icon: '✋', color: '#ff7875' }
    };
    return modes[mode] || modes[1];
  };

  // Format large numbers
  const formatEnergy = (value) => {
    if (!value) return '0';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' MWh';
    return value.toFixed(1) + ' kWh';
  };

  // Show loading spinner until data is fully loaded
  if (loading || !dataLoaded) {
    return (
      <div className="loxone-page">
        <div className="loxone-loading">
          <div className="loxone-spinner"></div>
          <span>{i18n.language === 'nl' ? 'Laden...' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  if (!loxoneAvailable) {
    return (
      <div className="loxone-page">
        <div className="loxone-unavailable">
          <div className="unavailable-icon">🏠</div>
          <h2>{i18n.language === 'nl' ? 'Loxone niet beschikbaar' : 'Loxone unavailable'}</h2>
          <p>{i18n.language === 'nl' ? 'Controleer de verbinding met je Miniserver' : 'Check the connection to your Miniserver'}</p>
          <button className="retry-btn" onClick={loadLoxoneData}>
            {i18n.language === 'nl' ? 'Opnieuw proberen' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const uniqueRooms = getUniqueRooms();

  return (
    <div className="loxone-page loxone-dark">
      {/* View Toggle */}
      <div className="loxone-view-toggle">
        <button 
          className={`view-btn ${activeView === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveView('rooms')}
        >
          <span className="view-icon">🏠</span>
          <span className="view-label">{i18n.language === 'nl' ? 'Kamers' : 'Rooms'}</span>
        </button>
        <button 
          className={`view-btn ${activeView === 'energy' ? 'active' : ''}`}
          onClick={() => setActiveView('energy')}
        >
          <span className="view-icon">⚡</span>
          <span className="view-label">{i18n.language === 'nl' ? 'Energie' : 'Energy'}</span>
        </button>
      </div>

      {/* Rooms View */}
      {activeView === 'rooms' && (
        <div className="loxone-rooms-view">
          <div className="rooms-grid">
            {uniqueRooms.map((roomName, index) => {
              const data = getRoomData(roomName);
              const comfort = getComfortMode(data.mode);
              
              return (
                <div key={index} className="room-card">
                  {/* Room Header */}
                  <div className="room-header">
                    <h3 className="room-name">{roomName}</h3>
                    <span className={`room-status ${data.occupied ? 'occupied' : ''}`}>
                      {data.occupied ? '👤' : ''}
                    </span>
                  </div>

                  {/* Room Controls */}
                  <div className="room-controls">
                    {/* Audio Control Row */}
                    <div className="control-row audio-control">
                      <div className="control-icon">🎵</div>
                      <div className="control-info">
                        <span className="control-label">{i18n.language === 'nl' ? 'Audio' : 'Audio'}</span>
                      </div>
                      <div className="control-actions">
                        <button className="control-btn">−</button>
                        <button className="control-btn">+</button>
                      </div>
                    </div>

                    {/* Temperature Row */}
                    {data.temperature !== null && (
                      <div className="control-row temp-control">
                        <div className="control-icon temp-icon">🌡️</div>
                        <div className="control-info">
                          <span className="temp-value">{data.temperature.toFixed(1)}°</span>
                          {data.humidity && (
                            <span className="humidity-value">{data.humidity.toFixed(0)}%</span>
                          )}
                        </div>
                        <div className="control-status">
                          <span className="comfort-badge" style={{ background: comfort.color }}>
                            {comfort.icon} {comfort.label}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Lighting Row */}
                    <div className="control-row light-control">
                      <div className={`control-icon light-icon ${data.lightOn ? 'on' : 'off'}`}>
                        💡
                      </div>
                      <div className="control-info">
                        <span className="control-label">{i18n.language === 'nl' ? 'Verlichting' : 'Lighting'}</span>
                        <span className="control-sublabel">
                          {data.lightOn 
                            ? (i18n.language === 'nl' ? 'Aan' : 'On')
                            : (i18n.language === 'nl' ? 'Uit' : 'Off')}
                        </span>
                      </div>
                      <div 
                        className="control-toggle" 
                        onClick={() => handleLightToggle(data.lightUuid, data.lightOn)}
                        style={{ cursor: data.lightUuid ? 'pointer' : 'default' }}
                      >
                        <div className={`toggle-switch ${data.lightOn ? 'on' : ''}`}>
                          <div className="toggle-knob"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Energy View */}
      {activeView === 'energy' && energyData && (
        <div className="loxone-energy-view">
          {/* Energy Tabs */}
          <div className="energy-tabs">
            {['power', 'day', 'week', 'month', 'year'].map(tab => (
              <button
                key={tab}
                className={`energy-tab ${energyTab === tab ? 'active' : ''}`}
                onClick={() => setEnergyTab(tab)}
              >
                {tab === 'power' && (i18n.language === 'nl' ? 'Vermogen' : 'Power')}
                {tab === 'day' && (i18n.language === 'nl' ? 'Dag' : 'Day')}
                {tab === 'week' && (i18n.language === 'nl' ? 'Week' : 'Week')}
                {tab === 'month' && (i18n.language === 'nl' ? 'Maand' : 'Month')}
                {tab === 'year' && (i18n.language === 'nl' ? 'Jaar' : 'Year')}
              </button>
            ))}
          </div>

          {/* Energy Content */}
          <div className="energy-content">
            {/* Current Power Display */}
            <div className="energy-main">
              <div className="energy-donut">
                <svg viewBox="0 0 200 200" className="donut-chart">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#2a2a2a"
                    strokeWidth="20"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#ff7875"
                    strokeWidth="20"
                    strokeDasharray={`${Math.min(energyData.currentUsage * 500, 500)} 503`}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="donut-center">
                  <span className="power-value">{(energyData.currentUsage * 1000).toFixed(0)}</span>
                  <span className="power-unit">W</span>
                </div>
              </div>

              <div className="energy-legend">
                <div className="legend-item consumption">
                  <span className="legend-dot"></span>
                  <span className="legend-label">{i18n.language === 'nl' ? 'Verbruik' : 'Consumption'}</span>
                </div>
                {energyData.returnDay > 0 && (
                  <div className="legend-item delivery">
                    <span className="legend-dot"></span>
                    <span className="legend-label">{i18n.language === 'nl' ? 'Teruglevering' : 'Delivery'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Energy Stats Grid */}
            <div className="energy-stats-grid">
              {energyTab === 'power' && (
                <>
                  <div className="energy-stat-card">
                    <span className="stat-label">{i18n.language === 'nl' ? 'Nu' : 'Now'}</span>
                    <span className="stat-value">{(energyData.currentUsage * 1000).toFixed(0)} W</span>
                  </div>
                  <div className="energy-stat-card">
                    <span className="stat-label">{i18n.language === 'nl' ? 'Vandaag' : 'Today'}</span>
                    <span className="stat-value">{energyData.totalDay?.toFixed(1) || '0.0'} kWh</span>
                  </div>
                </>
              )}
              {energyTab === 'day' && (
                <>
                  <div className="energy-stat-card">
                    <span className="stat-label">{i18n.language === 'nl' ? 'Verbruik' : 'Usage'}</span>
                    <span className="stat-value">{energyData.totalDay?.toFixed(1) || '0.0'} kWh</span>
                  </div>
                  <div className="energy-stat-card">
                    <span className="stat-label">{i18n.language === 'nl' ? 'Teruglevering' : 'Return'}</span>
                    <span className="stat-value">{energyData.returnDay?.toFixed(1) || '0.0'} kWh</span>
                  </div>
                </>
              )}
              {energyTab === 'week' && (
                <div className="energy-stat-card">
                  <span className="stat-label">{i18n.language === 'nl' ? 'Verbruik' : 'Usage'}</span>
                  <span className="stat-value">{formatEnergy(energyData.totalWeek)}</span>
                </div>
              )}
              {energyTab === 'month' && (
                <div className="energy-stat-card">
                  <span className="stat-label">{i18n.language === 'nl' ? 'Verbruik' : 'Usage'}</span>
                  <span className="stat-value">{formatEnergy(energyData.totalMonth)}</span>
                </div>
              )}
              {energyTab === 'year' && (
                <div className="energy-stat-card">
                  <span className="stat-label">{i18n.language === 'nl' ? 'Verbruik' : 'Usage'}</span>
                  <span className="stat-value">{formatEnergy(energyData.totalYear)}</span>
                </div>
              )}
            </div>

            {/* Cost Estimation */}
            <div className="energy-cost">
              <h4>{i18n.language === 'nl' ? 'Geschatte kosten' : 'Estimated costs'}</h4>
              <div className="cost-grid">
                <div className="cost-item">
                  <span className="cost-label">{i18n.language === 'nl' ? 'Per uur' : 'Per hour'}</span>
                  <span className="cost-value">€{(energyData.currentUsage * 0.35).toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">{i18n.language === 'nl' ? 'Vandaag' : 'Today'}</span>
                  <span className="cost-value">€{((energyData.totalDay || 0) * 0.35).toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">{i18n.language === 'nl' ? 'Deze maand' : 'This month'}</span>
                  <span className="cost-value">€{((energyData.totalMonth || 0) * 0.35).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="loxone-footer">
        <span className="last-updated">
          {i18n.language === 'nl' ? 'Bijgewerkt: ' : 'Updated: '}
          {new Date().toLocaleTimeString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
        <button className="refresh-btn" onClick={loadLoxoneData}>
          🔄
        </button>
      </div>
    </div>
  );
};

export default LoxonePage;
