import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import './i18n/i18n';
import CalendarPage from './pages/CalendarPage';
import FamilyPage from './pages/FamilyPage';
import ListsPage from './pages/ListsPage';
import BriefingPage from './pages/BriefingPage';
import SettingsPage from './pages/SettingsPage';
import LoxonePage from './pages/LoxonePage';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import { LoxoneProvider } from './context/LoxoneContext';
import { CalendarProvider, useCalendar } from './context/CalendarContext';
import { ListsProvider, useLists } from './context/ListsContext';
import { MealsProvider } from './context/MealsContext';
import { TimerProvider } from './context/TimerContext';
import { getSmartSuggestions, fetchRealRecipes } from './utils/calendarHelper';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('briefing');
  const { events } = useCalendar();
  const { lists } = useLists();
  const [allAlerts, setAllAlerts] = useState([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState([]);

  // Load dismissed alerts from localStorage
  const loadDismissedAlerts = useCallback(() => {
    try {
      const stored = localStorage.getItem('dismissedAlerts');
      if (!stored) return {};
      
      const dismissed = JSON.parse(stored);
      const now = new Date();
      
      // Clean up old dismissed alerts (older than 30 days)
      const cleaned = {};
      Object.keys(dismissed).forEach(key => {
        const dismissedDate = new Date(dismissed[key]);
        const daysDiff = Math.floor((now - dismissedDate) / (1000 * 60 * 60 * 24));
        
        // Also validate the date format - if invalid, skip it
        if (isNaN(dismissedDate.getTime())) {
          console.warn('Invalid dismissed alert date:', key, dismissed[key]);
          return;
        }
        
        if (daysDiff < 30) {
          cleaned[key] = dismissed[key];
        } else {
          console.log('Removing old dismissed alert:', key, `(${daysDiff} days old)`);
        }
      });
      
      if (Object.keys(cleaned).length !== Object.keys(dismissed).length) {
        localStorage.setItem('dismissedAlerts', JSON.stringify(cleaned));
        console.log('Cleaned up dismissed alerts:', {
          before: Object.keys(dismissed).length,
          after: Object.keys(cleaned).length
        });
      }
      
      return cleaned;
    } catch (error) {
      console.error('Error loading dismissed alerts:', error);
      return {};
    }
  }, []);

  // Update dismissed alert IDs from localStorage
  const refreshDismissedAlerts = useCallback(() => {
    const dismissed = loadDismissedAlerts();
    const ids = Object.keys(dismissed);
    console.log('App.js refreshDismissedAlerts:', { dismissed, ids });
    setDismissedAlertIds(ids);
  }, [loadDismissedAlerts]);

  // Update alerts whenever events or lists change
  const updateAlerts = useCallback(() => {
    const kidsItemsCount = lists.reduce((total, list) => {
      return total + list.items.filter(item => !item.completed && !item.checked && item.category === 'kids').length;
    }, 0);

    console.log('App.js updateAlerts called:', {
      eventsCount: events.length,
      kidsItemsCount,
      eventsAvailable: events.length > 0
    });

    const alerts = getSmartSuggestions(events, kidsItemsCount);
    console.log('App.js generated alerts:', alerts);
    setAllAlerts(alerts);
  }, [events, lists]);

  // Restore a dismissed alert
  const handleRestoreAlert = useCallback((alert) => {
    const alertId = `${alert.type}-${alert.title}`;
    const eventSpecificId = alert.eventDate ? `${alertId}-${alert.eventDate}` : alertId;
    
    console.log('App.js handleRestoreAlert:', { alert, alertId, eventSpecificId });
    
    const dismissed = loadDismissedAlerts();
    delete dismissed[eventSpecificId];
    delete dismissed[alertId]; // Also remove generic ID
    
    console.log('App.js after deleting:', dismissed);
    
    localStorage.setItem('dismissedAlerts', JSON.stringify(dismissed));
    
    // Force immediate refresh of dismissed alert IDs
    const newIds = Object.keys(dismissed);
    console.log('App.js setting new dismissed IDs:', newIds);
    setDismissedAlertIds(newIds);
  }, [loadDismissedAlerts]);

  // Initialize dismissed alerts on mount
  useEffect(() => {
    refreshDismissedAlerts();
  }, [refreshDismissedAlerts]);

  // Fetch real recipes from API on mount and update alerts
  useEffect(() => {
    const loadRecipesAndAlerts = async () => {
      await fetchRealRecipes();
      updateAlerts();
    };
    loadRecipesAndAlerts();
  }, [updateAlerts]);

  // Update alerts when events or lists change
  useEffect(() => {
    updateAlerts();
  }, [updateAlerts]);

  // Listen for storage changes (when alerts are dismissed in BriefingPage)
  useEffect(() => {
    const handleStorageChange = () => {
      refreshDismissedAlerts();
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen to custom event for same-window updates
    window.addEventListener('dismissedAlertsChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dismissedAlertsChanged', handleStorageChange);
    };
  }, [refreshDismissedAlerts]);

  // Update alerts every 5 minutes
  useEffect(() => {
    const alertsInterval = setInterval(() => {
      updateAlerts();
    }, 300000);

    return () => clearInterval(alertsInterval);
  }, [updateAlerts]);

  return (
    <div className="app">
      <Header 
        onNavigate={setCurrentPage}
        alerts={allAlerts}
        dismissedAlertIds={dismissedAlertIds}
        onRestoreAlert={handleRestoreAlert}
      />
      
      <main className="main-content">
        {currentPage === 'briefing' && (
          <BriefingPage 
            allAlerts={allAlerts}
            dismissedAlertIds={dismissedAlertIds}
            onRestoreAlert={handleRestoreAlert}
            onNavigate={setCurrentPage}
          />
        )}
        {currentPage === 'home' && <LoxonePage />}
        {currentPage === 'calendar' && <CalendarPage />}
        {currentPage === 'family' && <FamilyPage />}
        {currentPage === 'lists' && <ListsPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>

      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}

function App() {
  return (
    <TimerProvider>
      <LoxoneProvider>
        <CalendarProvider>
          <MealsProvider>
            <ListsProvider>
              <AppContent />
            </ListsProvider>
          </MealsProvider>
        </CalendarProvider>
      </LoxoneProvider>
    </TimerProvider>
  );
}

export default App;
