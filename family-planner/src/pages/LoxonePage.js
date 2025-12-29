import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import './LoxonePage.css';

const LoxonePage = () => {
  const { t, i18n } = useTranslation();
  const [loxoneAvailable, setLoxoneAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [energyData, setEnergyData] = useState(null);
  const [sensorsData, setSensorsData] = useState(null);
  const [lightsData, setLightsData] = useState(null);
  const [roomsData, setRoomsData] = useState([]);
  const [prevEnergyData, setPrevEnergyData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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
        setRoomsData(rooms);
        setEnergyData(energy);
        setSensorsData(sensors);
        setLightsData(lights);
      }
    } catch (error) {
      console.error('Failed to load Loxone data:', error);
      setLoxoneAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLoxoneData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadLoxoneData, 30000);
    return () => clearInterval(interval);
  }, [loadLoxoneData]);

  // Track power trend
  useEffect(() => {
    if (energyData) {
      const timer = setTimeout(() => {
        setPrevEnergyData(energyData);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [energyData]);

  const getPowerTrend = () => {
    if (!energyData || !prevEnergyData) return null;
    const diff = energyData.currentUsage - prevEnergyData.currentUsage;
    if (diff > 0.05) return 'up';
    if (diff < -0.05) return 'down';
    return 'stable';
  };

  const getTemperatureComfort = (temp) => {
    if (temp < 19) return { level: 'cold', color: '#4FC3F7', label: i18n.language === 'nl' ? 'Koud' : 'Cold' };
    if (temp > 22) return { level: 'warm', color: '#FF9800', label: i18n.language === 'nl' ? 'Warm' : 'Warm' };
    return { level: 'comfortable', color: '#8BC34A', label: 'OK' };
  };

  const getHumidityStatus = (humidity) => {
    if (humidity < 30) return { status: 'dry', color: '#FF9800', label: i18n.language === 'nl' ? 'Droog' : 'Dry' };
    if (humidity > 60) return { status: 'humid', color: '#FF9800', label: i18n.language === 'nl' ? 'Vochtig' : 'Humid' };
    return { status: 'good', color: '#8BC34A', label: 'OK' };
  };

  const powerTrend = getPowerTrend();

  // Get all temperature sensors
  const getTemperatureSensors = () => {
    return sensorsData?.filter(s => s.type === 'temperature') || [];
  };

  // Get all humidity sensors
  const getHumiditySensors = () => {
    return sensorsData?.filter(s => s.type === 'humidity') || [];
  };

  if (loading) {
    return (
      <div className="loxone-page">
        <div className="loxone-loading">
          <div className="loading-spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!loxoneAvailable) {
    return (
      <div className="loxone-page">
        <div className="loxone-unavailable">
          <span className="unavailable-icon">🏠</span>
          <h2>{i18n.language === 'nl' ? 'Loxone niet verbonden' : 'Loxone not connected'}</h2>
          <p>{i18n.language === 'nl' 
            ? 'Configureer je Loxone Miniserver in de instellingen' 
            : 'Configure your Loxone Miniserver in settings'}</p>
          <button className="retry-button" onClick={loadLoxoneData}>
            {i18n.language === 'nl' ? 'Opnieuw proberen' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loxone-page">
      {/* Tab Navigation */}
      <div className="loxone-tabs">
        <button 
          className={`loxone-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          {i18n.language === 'nl' ? '📊 Overzicht' : '📊 Overview'}
        </button>
        <button 
          className={`loxone-tab ${activeTab === 'climate' ? 'active' : ''}`}
          onClick={() => setActiveTab('climate')}
        >
          {i18n.language === 'nl' ? '🌡️ Klimaat' : '🌡️ Climate'}
        </button>
        <button 
          className={`loxone-tab ${activeTab === 'energy' ? 'active' : ''}`}
          onClick={() => setActiveTab('energy')}
        >
          {i18n.language === 'nl' ? '⚡ Energie' : '⚡ Energy'}
        </button>
        <button 
          className={`loxone-tab ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          {i18n.language === 'nl' ? '🚪 Kamers' : '🚪 Rooms'}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="loxone-content">
          {/* Quick Stats */}
          <section className="loxone-section">
            <h3 className="section-title">{i18n.language === 'nl' ? 'Quick Status' : 'Quick Status'}</h3>
            <div className="quick-stats-grid">
              {/* Power */}
              {energyData && energyData.currentUsage !== null && (
                <div className="stat-card energy">
                  <div className="stat-icon">⚡</div>
                  <div className="stat-info">
                    <span className="stat-value">{(energyData.currentUsage * 1000).toFixed(0)} W</span>
                    <span className="stat-label">{i18n.language === 'nl' ? 'Verbruik' : 'Usage'}</span>
                    {powerTrend && (
                      <span className={`stat-trend trend-${powerTrend}`}>
                        {powerTrend === 'up' ? '↑' : powerTrend === 'down' ? '↓' : '→'}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Temperature */}
              {sensorsData?.find(s => s.type === 'temperature') && (() => {
                const tempSensor = sensorsData.find(s => s.type === 'temperature');
                const comfort = getTemperatureComfort(tempSensor.value);
                return (
                  <div className="stat-card temperature" style={{ borderColor: comfort.color }}>
                    <div className="stat-icon">🌡️</div>
                    <div className="stat-info">
                      <span className="stat-value" style={{ color: comfort.color }}>{tempSensor.value.toFixed(1)}°C</span>
                      <span className="stat-label">{tempSensor.name}</span>
                    </div>
                  </div>
                );
              })()}
              
              {/* Humidity */}
              {sensorsData?.find(s => s.type === 'humidity') && (() => {
                const humiditySensor = sensorsData.find(s => s.type === 'humidity');
                const status = getHumidityStatus(humiditySensor.value);
                return (
                  <div className="stat-card humidity" style={{ borderColor: status.color }}>
                    <div className="stat-icon">💧</div>
                    <div className="stat-info">
                      <span className="stat-value" style={{ color: status.color }}>{humiditySensor.value.toFixed(0)}%</span>
                      <span className="stat-label">{i18n.language === 'nl' ? 'Luchtvochtigheid' : 'Humidity'}</span>
                    </div>
                  </div>
                );
              })()}
              
              {/* Occupancy */}
              {roomsData && roomsData.length > 0 && roomsData[0].room && (
                <div className="stat-card occupancy">
                  <div className="stat-icon">{roomsData[0].occupied ? '👤' : '🚪'}</div>
                  <div className="stat-info">
                    <span className="stat-value">{roomsData[0].occupied 
                      ? (i18n.language === 'nl' ? 'Bezet' : 'Occupied') 
                      : (i18n.language === 'nl' ? 'Leeg' : 'Empty')}</span>
                    <span className="stat-label">{roomsData[0].room}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Active Lights */}
          {lightsData && lightsData.length > 0 && (
            <section className="loxone-section">
              <h3 className="section-title">{i18n.language === 'nl' ? '💡 Verlichting' : '💡 Lighting'}</h3>
              <div className="lights-grid">
                {lightsData.slice(0, 6).map((light, index) => (
                  <div key={index} className={`light-card ${light.on ? 'light-on' : 'light-off'}`}>
                    <span className="light-icon">{light.on ? '💡' : '🔅'}</span>
                    <span className="light-name">{light.name}</span>
                    {light.brightness && <span className="light-brightness">{light.brightness}%</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Climate Tab */}
      {activeTab === 'climate' && (
        <div className="loxone-content">
          <section className="loxone-section">
            <h3 className="section-title">{i18n.language === 'nl' ? '🌡️ Temperatuur per Kamer' : '🌡️ Temperature by Room'}</h3>
            <div className="climate-grid">
              {getTemperatureSensors().map((sensor, index) => {
                const comfort = getTemperatureComfort(sensor.value);
                return (
                  <div key={index} className="climate-card">
                    <div className="climate-room">{sensor.name}</div>
                    <div className="climate-temp" style={{ color: comfort.color }}>
                      {sensor.value.toFixed(1)}°C
                    </div>
                    <div className="climate-status" style={{ background: comfort.color }}>
                      {comfort.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="loxone-section">
            <h3 className="section-title">{i18n.language === 'nl' ? '💧 Luchtvochtigheid' : '💧 Humidity'}</h3>
            <div className="climate-grid">
              {getHumiditySensors().map((sensor, index) => {
                const status = getHumidityStatus(sensor.value);
                return (
                  <div key={index} className="climate-card">
                    <div className="climate-room">{sensor.name}</div>
                    <div className="climate-temp" style={{ color: status.color }}>
                      {sensor.value.toFixed(0)}%
                    </div>
                    <div className="climate-status" style={{ background: status.color }}>
                      {status.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Energy Tab */}
      {activeTab === 'energy' && (
        <div className="loxone-content">
          <section className="loxone-section">
            <h3 className="section-title">{i18n.language === 'nl' ? '⚡ Energieverbruik' : '⚡ Energy Usage'}</h3>
            
            {energyData && (
              <div className="energy-dashboard">
                {/* Current Usage */}
                <div className="energy-main-card">
                  <div className="energy-main-icon">⚡</div>
                  <div className="energy-main-value">
                    {(energyData.currentUsage * 1000).toFixed(0)}
                    <span className="energy-unit">W</span>
                  </div>
                  <div className="energy-main-label">
                    {i18n.language === 'nl' ? 'Huidig verbruik' : 'Current usage'}
                  </div>
                  {powerTrend && (
                    <div className={`energy-trend trend-${powerTrend}`}>
                      {powerTrend === 'up' && (i18n.language === 'nl' ? '↑ Stijgend' : '↑ Rising')}
                      {powerTrend === 'down' && (i18n.language === 'nl' ? '↓ Dalend' : '↓ Falling')}
                      {powerTrend === 'stable' && (i18n.language === 'nl' ? '→ Stabiel' : '→ Stable')}
                    </div>
                  )}
                </div>

                {/* Cost Estimation */}
                <div className="energy-stats">
                  <div className="energy-stat">
                    <span className="energy-stat-label">{i18n.language === 'nl' ? 'Kosten per uur' : 'Cost per hour'}</span>
                    <span className="energy-stat-value">€{(energyData.currentUsage * 0.35).toFixed(2)}</span>
                  </div>
                  <div className="energy-stat">
                    <span className="energy-stat-label">{i18n.language === 'nl' ? 'Geschat vandaag' : 'Estimated today'}</span>
                    <span className="energy-stat-value">€{(energyData.currentUsage * 0.35 * 24).toFixed(2)}</span>
                  </div>
                  {energyData.todayTotal && (
                    <div className="energy-stat">
                      <span className="energy-stat-label">{i18n.language === 'nl' ? 'Vandaag totaal' : 'Today total'}</span>
                      <span className="energy-stat-value">{energyData.todayTotal.toFixed(2)} kWh</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div className="loxone-content">
          <section className="loxone-section">
            <h3 className="section-title">{i18n.language === 'nl' ? '🚪 Kamer Status' : '🚪 Room Status'}</h3>
            <div className="rooms-grid">
              {roomsData && roomsData.map((room, index) => (
                <div key={index} className={`room-card ${room.occupied ? 'occupied' : ''}`}>
                  <div className="room-header">
                    <span className="room-name">{room.room || room.name}</span>
                    <span className={`room-status ${room.occupied ? 'status-occupied' : 'status-empty'}`}>
                      {room.occupied 
                        ? (i18n.language === 'nl' ? 'Bezet' : 'Occupied')
                        : (i18n.language === 'nl' ? 'Leeg' : 'Empty')}
                    </span>
                  </div>
                  {room.temperature && (
                    <div className="room-detail">
                      <span>🌡️</span>
                      <span>{room.temperature.toFixed(1)}°C</span>
                    </div>
                  )}
                  {room.humidity && (
                    <div className="room-detail">
                      <span>💧</span>
                      <span>{room.humidity}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Last Updated */}
      <div className="loxone-footer">
        <span className="last-updated">
          {i18n.language === 'nl' ? 'Laatste update: ' : 'Last updated: '}
          {new Date().toLocaleTimeString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button className="refresh-button" onClick={loadLoxoneData}>
          🔄 {i18n.language === 'nl' ? 'Vernieuwen' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default LoxonePage;
