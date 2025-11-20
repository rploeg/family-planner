import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import TimerModal from './TimerModal';
import weatherService from '../services/weatherService';
import { useTimer } from '../context/TimerContext';
import './Header.css';

const Header = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const { i18n } = useTranslation();
  const { remainingTime, isRunning, isPaused, pauseTimer, resumeTimer, stopTimer, formatTime: formatTimerTime } = useTimer();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000); // Update every minute

    // Load real weather
    loadWeather();
    const weatherTimer = setInterval(loadWeather, 600000); // Update every 10 minutes

    return () => {
      clearInterval(timer);
      clearInterval(weatherTimer);
    };
  }, []);

  const loadWeather = async () => {
    try {
      const data = await weatherService.getWeather();
      setWeather(data.current);
    } catch (error) {
      console.error('Failed to load weather:', error);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: i18n.language !== 'nl'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return i18n.language === 'nl' ? 'Goedemorgen' : 'Good Morning';
    if (hour < 18) return i18n.language === 'nl' ? 'Goedemiddag' : 'Good Afternoon';
    return i18n.language === 'nl' ? 'Goedenavond' : 'Good Evening';
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <span className="greeting-text">{getGreeting()}</span>
          <span className="weather-info">
            <span className="icon-cloud">{weather?.icon || '☁️'}</span>
            <span className="temp">{weather ? Math.round(weather.temperature) : '--'}°</span>
            <span className="weather-detail">{i18n.language === 'nl' ? 'Neerslag' : 'Rain'}: {weather?.precipitation || 0}%</span>
            <span className="weather-detail">{i18n.language === 'nl' ? 'Wind' : 'Wind'}: {weather ? Math.round(weather.windSpeed) : '--'} km/h</span>
          </span>
        </div>
        <div className="header-center">
          {isRunning ? (
            <div className="timer-display">
              <button 
                className="timer-button"
                onClick={() => setShowTimerModal(true)}
                title={i18n.language === 'nl' ? 'Timer beheren' : 'Manage timer'}
              >
                ⏱️
              </button>
              <span className={`timer-countdown ${remainingTime <= 60 ? 'timer-warning' : ''}`}>
                {formatTimerTime(remainingTime)}
              </span>
              <div className="timer-controls">
                {isPaused ? (
                  <button className="timer-control-btn" onClick={resumeTimer} title={i18n.language === 'nl' ? 'Hervatten' : 'Resume'}>
                    ▶️
                  </button>
                ) : (
                  <button className="timer-control-btn" onClick={pauseTimer} title={i18n.language === 'nl' ? 'Pauzeren' : 'Pause'}>
                    ⏸️
                  </button>
                )}
                <button className="timer-control-btn" onClick={stopTimer} title={i18n.language === 'nl' ? 'Stoppen' : 'Stop'}>
                  ⏹️
                </button>
              </div>
            </div>
          ) : (
            <div className="header-center-content">
              <h1 className="logo">LOXONE</h1>
              <button 
                className="timer-icon-button"
                onClick={() => setShowTimerModal(true)}
                title={i18n.language === 'nl' ? 'Timer instellen' : 'Set timer'}
              >
                ⏱️
              </button>
            </div>
          )}
        </div>
        <div className="header-right">
          <span className="time">{formatTime(time)}</span>
          <LanguageSwitcher />
        </div>
      </header>

      <TimerModal 
        isOpen={showTimerModal} 
        onClose={() => setShowTimerModal(false)} 
      />
    </>
  );
};

export default Header;
