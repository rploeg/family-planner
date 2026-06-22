import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import TimerModal from './TimerModal';
import NotificationsModal from './NotificationsModal';
import { useTimer } from '../context/TimerContext';
import { useLists } from '../context/ListsContext';
import './Header.css';

const Header = ({ onNavigate, alerts = [], dismissedAlertIds = [], onRestoreAlert }) => {
  const [time, setTime] = useState(new Date());
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const { i18n } = useTranslation();
  const { remainingTime, isRunning, isPaused, pauseTimer, resumeTimer, stopTimer, formatTime: formatTimerTime } = useTimer();
  const { lists } = useLists();

  // Calculate total uncompleted items across all lists
  const getTotalItems = () => {
    return lists.reduce((total, list) => {
      return total + list.items.filter(item => !item.completed && !item.checked).length;
    }, 0);
  };

  // Calculate kids items
  const getKidsItems = () => {
    return lists.reduce((total, list) => {
      return total + list.items.filter(item => !item.completed && !item.checked && item.category === 'kids').length;
    }, 0);
  };

  const totalItems = getTotalItems();
  const kidsItems = getKidsItems();

  // Count active alerts (those not dismissed)
  const activeAlertsCount = alerts.filter(alert => {
    const alertId = `${alert.type}-${alert.title}`;
    const eventSpecificId = alert.eventDate ? `${alertId}-${alert.eventDate}` : alertId;
    return !dismissedAlertIds.includes(eventSpecificId) && !dismissedAlertIds.includes(alertId);
  }).length;

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000); // Update every minute

    return () => {
      clearInterval(timer);
    };
  }, []);

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
          <button 
            className="notification-bell-button"
            onClick={() => setShowNotificationsModal(true)}
            title={i18n.language === 'nl' ? 'Meldingen' : 'Notifications'}
          >
            🔔
            {activeAlertsCount > 0 && (
              <span className="notification-badge">{activeAlertsCount}</span>
            )}
          </button>
          <button 
            className="shopping-basket-button"
            onClick={() => onNavigate && onNavigate('lists')}
            title={i18n.language === 'nl' ? 'Boodschappenlijst' : 'Shopping list'}
          >
            🛒
            {totalItems > 0 && (
              <span className="basket-badge">{totalItems}</span>
            )}
          </button>
          <span className="time">{formatTime(time)}</span>
        </div>
      </header>

      <TimerModal 
        isOpen={showTimerModal} 
        onClose={() => setShowTimerModal(false)} 
      />

      <NotificationsModal 
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        alerts={alerts}
        dismissedAlertIds={dismissedAlertIds}
        onRestoreAlert={onRestoreAlert}
      />
    </>
  );
};

export default Header;
