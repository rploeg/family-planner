# Apple Calendar Integration

## Overview

This app includes integration with Apple Calendar via the CalDAV protocol. The integration allows bidirectional sync between the Family Planner app and your iCloud Calendar.

## Current Status

⚠️ **The Apple Calendar integration requires a backend CalDAV proxy server.**

Currently, the app uses **local storage** to store calendar events. To enable real Apple Calendar sync, you need to deploy a backend proxy service.

## Why a Backend Proxy?

Web browsers block direct CalDAV requests to iCloud due to CORS (Cross-Origin Resource Sharing) restrictions. A backend proxy server:
- Handles authentication with iCloud
- Forwards CalDAV requests
- Returns data to the web app
- Keeps your credentials secure

## Setup Instructions

### Option 1: Use the Node.js CalDAV Proxy (Recommended)

1. **Create a backend server:**

```bash
cd family-planner
mkdir server
cd server
npm init -y
npm install express cors node-fetch xml2js
```

2. **Create `server/caldav-proxy.js`:**

```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const CALDAV_URL = 'https://caldav.icloud.com';

// Proxy CalDAV requests
app.all('/api/caldav/*', async (req, res) => {
  const auth = req.headers.authorization;
  
  if (!auth) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const path = req.path.replace('/api/caldav', '');
  const url = `${CALDAV_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': auth,
        'Content-Type': req.headers['content-type'] || 'application/xml',
        'Depth': '1'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error('CalDAV proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`CalDAV proxy running on http://localhost:${PORT}`);
});
```

3. **Update `.env` file:**

```
REACT_APP_CALDAV_PROXY=http://localhost:3001/api/caldav
```

4. **Start the proxy server:**

```bash
node server/caldav-proxy.js
```

5. **Start the React app in another terminal:**

```bash
npm start
```

### Option 2: Deploy to Cloud

#### Vercel/Netlify Functions

Create a serverless function to proxy CalDAV requests:

```javascript
// api/caldav.js
export default async function handler(req, res) {
  const CALDAV_URL = 'https://caldav.icloud.com';
  const auth = req.headers.authorization;
  
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const response = await fetch(`${CALDAV_URL}${req.query.path}`, {
    method: req.method,
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/xml'
    },
    body: req.body
  });

  const data = await response.text();
  res.status(response.status).send(data);
}
```

#### AWS Lambda

Deploy an AWS Lambda function with API Gateway to handle CalDAV proxying.

## Getting App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Navigate to **Security** → **App-Specific Passwords**
4. Click **Generate Password**
5. Enter "Family Planner" as the label
6. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)
7. Use this password in the app settings

## Features

Once the backend proxy is configured:

### ✅ Supported Features
- Import events from Apple Calendar
- Create events in Apple Calendar
- Update existing events
- Delete synced events
- Two-way sync
- Support for multiple calendars

### ⚠️ Limitations
- **Automation settings** (room control, temperature, music) are stored locally only
- Recurrence rules may have limited support
- Some advanced Apple Calendar features may not sync

## Security Notes

- App-specific passwords are stored encrypted in localStorage
- Never commit credentials to version control
- Use HTTPS in production
- The proxy server should validate and sanitize all requests
- Consider rate limiting to prevent abuse

## Alternative: Native App

For the best Apple Calendar integration, consider building a native macOS/iOS app using EventKit framework, which provides direct access to the Calendar database without needing a proxy.

## Troubleshooting

### "Failed to connect to Apple Calendar"
- Verify your Apple ID email is correct
- Ensure you're using an app-specific password, not your regular Apple password
- Check that 2FA is enabled on your Apple ID
- Verify the proxy server is running

### "CORS error"
- Make sure the backend proxy server is running
- Check that `REACT_APP_CALDAV_PROXY` points to the correct URL
- Verify CORS is enabled on the proxy server

### Events not syncing
- Check browser console for errors
- Verify the sync toggle is enabled in settings
- Try disconnecting and reconnecting
- Check that the proxy server has internet access

## Current Functionality (Without Backend)

The app currently works fully with **local storage**:
- ✅ Create, edit, delete events
- ✅ Calendar organization
- ✅ Home automation settings
- ✅ Family member management
- ✅ All data persists in browser

The Apple Calendar sync is an **optional enhancement** that requires backend setup.
