import React from 'react';
import { useTranslation } from 'react-i18next';
import './BottomNav.css';

const BottomNav = ({ currentPage, onNavigate }) => {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${currentPage === 'briefing' ? 'nav-item-active' : ''}`}
        onClick={() => onNavigate('briefing')}
      >
        <span className="nav-icon">☀️</span>
        <span className="nav-label">{t('nav.briefing')}</span>
      </button>
      <button
        className={`nav-item ${currentPage === 'calendar' ? 'nav-item-active' : ''}`}
        onClick={() => onNavigate('calendar')}
      >
        <span className="nav-icon">📅</span>
        <span className="nav-label">{t('nav.calendar')}</span>
      </button>
      <button
        className={`nav-item ${currentPage === 'lists' ? 'nav-item-active' : ''}`}
        onClick={() => onNavigate('lists')}
      >
        <span className="nav-icon">✓</span>
        <span className="nav-label">{t('nav.lists')}</span>
      </button>
      <button
        className={`nav-item ${currentPage === 'settings' ? 'nav-item-active' : ''}`}
        onClick={() => onNavigate('settings')}
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">{t('nav.settings')}</span>
      </button>
    </nav>
  );
};

export default BottomNav;
