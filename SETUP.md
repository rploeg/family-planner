# Family Planner Setup Guide

## What's Been Implemented

✅ **Temperature Fix**: All temperatures now display in Celsius (20-22°C)
✅ **Backend Proxy Server**: Node.js/Express server on port 3001
✅ **Swift EventKit Bridge**: Native Apple Calendar access via Swift CLI
✅ **React Integration**: Web app updated to use backend API
✅ **REST API**: Full CRUD operations for calendar events

## Current Running Services

1. **Calendar Proxy Server**: http://localhost:3001
   - Provides EventKit bridge for Apple Calendar
   - REST API endpoints for calendar operations
   
2. **React Web App**: http://localhost:3000
   - Family planner interface
   - Calendar event management
   - Loxone integration settings

## Quick Start

### Terminal 1: Calendar Proxy Server
```bash
cd /Users/remco/repo/pms-access-api/calendar-proxy
node server.js
```
Keep this running in the background.

### Terminal 2: React App
```bash
cd /Users/remco/repo/pms-access-api/family-planner
npm start
```
Your browser will open to http://localhost:3000

## First Time Setup

### Grant Calendar Permissions

When you first interact with the calendar in the web app:
1. macOS will show a permission dialog
2. Click "OK" to grant calendar access
3. The app will then sync with your Apple Calendar

### Test the Integration

1. Open http://localhost:3000 in your browser
2. Navigate to the Calendar tab
3. Create a new event with:
   - Title
   - Time
   - Location (optional)
   - Attendees (select family members)
   - Automation settings (room + temperature in °C)
4. The event will be created in your Apple Calendar
5. Check Calendar.app to verify

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  React Web App  │────────>│  Express Proxy   │────────>│  Swift CLI Tool  │
│  (port 3000)    │  HTTP   │  (port 3001)     │  exec   │  (EventKit)      │
└─────────────────┘         └──────────────────┘         └──────────────────┘
                                                                    │
                                                                    v
                                                          ┌──────────────────┐
                                                          │  Apple Calendar  │
                                                          │  (EventKit DB)   │
                                                          └──────────────────┘
```

## Temperature Display

All temperatures are now in Celsius:
- Room mock data: 20-22°C
- Event automation: Input accepts 15-30°C with 0.5° steps
- Display: Shows °C symbol

## API Endpoints

- `GET /api/calendar/events` - List events
- `POST /api/calendar/events` - Create event
- `PUT /api/calendar/events/:id` - Update event
- `DELETE /api/calendar/events/:id` - Delete event
- `GET /api/calendar/calendars` - List available calendars
- `GET /health` - Server health check

## Troubleshooting

### Calendar Proxy Not Starting
```bash
# Check if port 3001 is in use
lsof -ti:3001

# Kill existing process if needed
kill -9 $(lsof -ti:3001)

# Restart server
cd /Users/remco/repo/pms-access-api/calendar-proxy
node server.js
```

### React App Shows Connection Error
1. Ensure calendar proxy is running on port 3001
2. Check browser console for CORS errors
3. Verify both servers are running:
   - http://localhost:3001/health (should return JSON)
   - http://localhost:3000 (should load app)

### Calendar Access Denied
1. Open System Settings > Privacy & Security > Calendars
2. Ensure "Terminal" or "node" has calendar access
3. Grant permission if missing
4. Restart the calendar proxy server

### Events Not Syncing
1. Check Calendar.app to verify events exist
2. Open browser DevTools Network tab
3. Look for failed API calls to localhost:3001
4. Check calendar proxy server logs in terminal

## Next Steps

The backend proxy is now fully functional. You can:
1. Test event creation/editing/deletion
2. Verify sync with Apple Calendar
3. Connect Loxone automation triggers (future enhancement)
4. Add webhook support for event notifications (future enhancement)

## File Structure

```
pms-access-api/
├── calendar-proxy/          # Backend proxy server
│   ├── server.js            # Express server
│   ├── routes/
│   │   └── calendar.js      # API routes
│   ├── services/
│   │   └── eventkit.js      # EventKit wrapper
│   ├── calendar-cli         # Compiled Swift binary
│   ├── calendar-cli.swift   # Swift source
│   └── package.json
│
└── family-planner/          # React web app
    ├── src/
    │   ├── context/
    │   │   ├── CalendarContext.js  # Event state (localStorage for now)
    │   │   └── LoxoneContext.js    # Room/user data (Celsius temps)
    │   ├── components/
    │   │   ├── EventCard.js        # Event display
    │   │   └── EventModal.js       # Event creation/edit
    │   ├── services/
    │   │   └── appleCalendarService.js  # Backend API client
    │   └── pages/
    │       └── CalendarPage.js     # Main calendar view
    └── package.json
```
