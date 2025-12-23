import React, { useState } from 'react';
import './App.css';
import './i18n/i18n';
import CalendarPage from './pages/CalendarPage';
import FamilyPage from './pages/FamilyPage';
import ListsPage from './pages/ListsPage';
import BriefingPage from './pages/BriefingPage';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import { LoxoneProvider } from './context/LoxoneContext';
import { CalendarProvider } from './context/CalendarContext';
import { ListsProvider } from './context/ListsContext';
import { MealsProvider } from './context/MealsContext';
import { TimerProvider } from './context/TimerContext';

function App() {
  const [currentPage, setCurrentPage] = useState('briefing');

  return (
    <TimerProvider>
      <LoxoneProvider>
        <CalendarProvider>
          <MealsProvider>
            <ListsProvider>
              <div className="app">
                <Header onNavigate={setCurrentPage} />
                
                <main className="main-content">
                  {currentPage === 'briefing' && <BriefingPage />}
                  {currentPage === 'calendar' && <CalendarPage />}
                  {currentPage === 'family' && <FamilyPage />}
                  {currentPage === 'lists' && <ListsPage />}
                </main>

                <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
              </div>
            </ListsProvider>
          </MealsProvider>
        </CalendarProvider>
      </LoxoneProvider>
    </TimerProvider>
  );
}

export default App;
