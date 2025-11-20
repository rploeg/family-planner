import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../context/TimerContext';
import './TimerModal.css';

const TimerModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { startTimer } = useTimer();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  if (!isOpen) return null;

  const handlePreset = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    setHours(h);
    setMinutes(m);
    setSeconds(s);
  };

  const handleStart = () => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds > 0) {
      startTimer(totalSeconds);
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="timer-modal">
        <div className="modal-header">
          <h2>{t('timer.setTimer')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="timer-input-section">
          <div className="time-inputs">
            <div className="time-input-group">
              <label>{t('timer.hours')}</label>
              <input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
              />
            </div>
            <span className="time-separator">:</span>
            <div className="time-input-group">
              <label>{t('timer.minutes')}</label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              />
            </div>
            <span className="time-separator">:</span>
            <div className="time-input-group">
              <label>{t('timer.seconds')}</label>
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              />
            </div>
          </div>
        </div>

        <div className="preset-buttons">
          <button className="preset-button" onClick={() => handlePreset(60)}>
            1 {t('timer.min')}
          </button>
          <button className="preset-button" onClick={() => handlePreset(300)}>
            5 {t('timer.min')}
          </button>
          <button className="preset-button" onClick={() => handlePreset(600)}>
            10 {t('timer.min')}
          </button>
          <button className="preset-button" onClick={() => handlePreset(900)}>
            15 {t('timer.min')}
          </button>
          <button className="preset-button" onClick={() => handlePreset(1800)}>
            30 {t('timer.min')}
          </button>
          <button className="preset-button" onClick={() => handlePreset(3600)}>
            1 {t('timer.hour')}
          </button>
        </div>

        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button 
            className="start-button" 
            onClick={handleStart}
            disabled={hours === 0 && minutes === 0 && seconds === 0}
          >
            {t('timer.start')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerModal;
