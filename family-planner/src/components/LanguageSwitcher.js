import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'nl' ? 'en' : 'nl';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button className="language-switcher" onClick={toggleLanguage} title="Switch Language / Taal Wisselen">
      <span className="lang-flag">{i18n.language === 'nl' ? '🇳🇱' : '🇬🇧'}</span>
      <span className="lang-code">{i18n.language.toUpperCase()}</span>
    </button>
  );
};

export default LanguageSwitcher;
