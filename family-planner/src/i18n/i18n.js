import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      "nav.calendar": "Calendar",
      "nav.family": "Family",
      "nav.lists": "Lists",
      "nav.briefing": "Briefing",
      
      // Calendar
      "calendar.title": "CALENDAR",
      "calendar.subtitle": "APPLE CALENDAR INTEGRATION",
      "calendar.today": "Today's Schedule ›",
      "calendar.upcoming": "Upcoming Events ({{count}}) ›",
      "calendar.weekSchedule": "Week Schedule",
      "calendar.noEvents": "No events scheduled for today",
      "calendar.noUpcoming": "No upcoming events",
      "calendar.allDay": "All Day",
      "calendar.thisWeek": "This Week",
      
      // Event Modal
      "event.create": "Create Event",
      "event.edit": "Edit Event",
      "event.title": "Title",
      "event.date": "Date",
      "event.time": "Time",
      "event.location": "Location",
      "event.calendar": "Calendar",
      "event.attendees": "Attendees",
      "event.automation": "Home Automation",
      "event.room": "Room",
      "event.temperature": "Temperature",
      "event.music": "Music Preset",
      "event.tempAccess": "Temporary Access",
      "event.notes": "Notes",
      "event.save": "Save Event",
      "event.delete": "Delete Event",
      "event.cancel": "Cancel",
      
      // Settings
      "settings.title": "Settings",
      "settings.calendar": "Calendar",
      "settings.loxone": "Loxone",
      "settings.language": "Language",
      
      // Lists
      "lists.title": "LISTS",
      "lists.subtitle": "FAMILY SHOPPING & TASKS",
      "lists.shopping": "Shopping List",
      "lists.addItem": "Add item",
      "lists.createList": "Create New List",
      "lists.listName": "List Name",
      "lists.noItems": "No items yet",
      
      // Briefing
      "briefing.title": "MORNING BRIEFING",
      "briefing.subtitle": "TODAY'S OVERVIEW",
      "briefing.goodMorning": "Good Morning",
      "briefing.weather": "Weather",
      "briefing.todaysEvents": "Today's Events",
      "briefing.outdoorAlert": "Outdoor Event Alert",
      "briefing.weatherWarning": "Weather may affect your outdoor event:",
      
      // Weather
      "weather.temperature": "Temperature",
      "weather.feelsLike": "Feels like",
      "weather.humidity": "Humidity",
      "weather.wind": "Wind",
      "weather.precipitation": "Precipitation chance",
      
      // Common
      "common.add": "Add",
      "common.edit": "Edit",
      "common.delete": "Delete",
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.close": "Close",
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",
      
      // Days
      "days.mon": "MON",
      "days.tue": "TUE",
      "days.wed": "WED",
      "days.thu": "THU",
      "days.fri": "FRI",
      "days.sat": "SAT",
      "days.sun": "SUN",
      
      // Timer
      "timer.setTimer": "Set Timer",
      "timer.hours": "Hours",
      "timer.minutes": "Minutes",
      "timer.seconds": "Seconds",
      "timer.min": "min",
      "timer.hour": "hour",
      "timer.start": "Start Timer",
      "timer.pause": "Pause",
      "timer.resume": "Resume",
      "timer.stop": "Stop",
      "timer.manageTimer": "Manage timer",
    }
  },
  nl: {
    translation: {
      // Navigatie
      "nav.calendar": "Agenda",
      "nav.family": "Familie",
      "nav.lists": "Lijsten",
      "nav.briefing": "Start",
      
      // Agenda
      "calendar.title": "AGENDA",
      "calendar.subtitle": "APPLE KALENDER INTEGRATIE",
      "calendar.today": "Vandaag ›",
      "calendar.upcoming": "Komende Afspraken ({{count}}) ›",
      "calendar.weekSchedule": "Weekoverzicht",
      "calendar.noEvents": "Geen afspraken vandaag",
      "calendar.noUpcoming": "Geen komende afspraken",
      "calendar.allDay": "Hele dag",
      "calendar.thisWeek": "Deze Week",
      
      // Afspraak Modal
      "event.create": "Afspraak Maken",
      "event.edit": "Afspraak Bewerken",
      "event.title": "Titel",
      "event.date": "Datum",
      "event.time": "Tijd",
      "event.location": "Locatie",
      "event.calendar": "Kalender",
      "event.attendees": "Deelnemers",
      "event.automation": "Huis Automatisering",
      "event.room": "Kamer",
      "event.temperature": "Temperatuur",
      "event.music": "Muziek Preset",
      "event.tempAccess": "Tijdelijke Toegang",
      "event.notes": "Notities",
      "event.save": "Opslaan",
      "event.delete": "Verwijderen",
      "event.cancel": "Annuleren",
      
      // Instellingen
      "settings.title": "Instellingen",
      "settings.calendar": "Agenda",
      "settings.loxone": "Loxone",
      "settings.language": "Taal",
      
      // Lijsten
      "lists.title": "LIJSTEN",
      "lists.subtitle": "FAMILIE BOODSCHAPPEN & TAKEN",
      "lists.shopping": "Boodschappenlijst",
      "lists.addItem": "Item toevoegen",
      "lists.createList": "Nieuwe Lijst",
      "lists.listName": "Lijstnaam",
      "lists.noItems": "Nog geen items",
      
      // Briefing
      "briefing.title": "OCHTEND BRIEFING",
      "briefing.subtitle": "OVERZICHT VAN VANDAAG",
      "briefing.goodMorning": "Goedemorgen",
      "briefing.weather": "Weer",
      "briefing.todaysEvents": "Afspraken Vandaag",
      "briefing.outdoorAlert": "Buiten Activiteit Waarschuwing",
      "briefing.weatherWarning": "Het weer kan je buitenactiviteit beïnvloeden:",
      
      // Weer
      "weather.temperature": "Temperatuur",
      "weather.feelsLike": "Voelt als",
      "weather.humidity": "Luchtvochtigheid",
      "weather.wind": "Wind",
      "weather.precipitation": "Neerslagkans",
      
      // Algemeen
      "common.add": "Toevoegen",
      "common.edit": "Bewerken",
      "common.delete": "Verwijderen",
      "common.save": "Opslaan",
      "common.cancel": "Annuleren",
      "common.close": "Sluiten",
      "common.loading": "Laden...",
      "common.error": "Fout",
      "common.success": "Gelukt",
      
      // Dagen
      "days.mon": "MA",
      "days.tue": "DI",
      "days.wed": "WO",
      "days.thu": "DO",
      "days.fri": "VR",
      "days.sat": "ZA",
      "days.sun": "ZO",
      
      // Timer
      "timer.setTimer": "Timer Instellen",
      "timer.hours": "Uren",
      "timer.minutes": "Minuten",
      "timer.seconds": "Seconden",
      "timer.min": "min",
      "timer.hour": "uur",
      "timer.start": "Start Timer",
      "timer.pause": "Pauzeren",
      "timer.resume": "Hervatten",
      "timer.stop": "Stoppen",
      "timer.manageTimer": "Timer beheren",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'nl', // Default to Dutch
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
