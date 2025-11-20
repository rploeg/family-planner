# Family Planner Backend

Backend API server for Family Planner with SQLite database and CalDAV calendar integration.

## Features

- ✅ **SQLite Database** - All data stored persistently (meals, lists, family members, settings)
- ✅ **CalDAV Integration** - Sync with iCloud Calendar (works on Mac & Windows)
- ✅ **REST API** - Full CRUD operations for all resources
- ✅ **Cross-platform** - Runs on macOS, Windows, and Linux
- ✅ **Network Access** - Multiple devices can connect to one server

## Setup Instructions

### 1. Install Dependencies

```bash
cd family-planner-backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3002
DATABASE_PATH=./data/family-planner.db

# iCloud Calendar Settings
CALDAV_SERVER_URL=https://caldav.icloud.com
CALDAV_USERNAME=your-apple-id@icloud.com
CALDAV_PASSWORD=your-app-specific-password

# Allow frontend connections
CORS_ORIGIN=http://localhost:3000,http://192.168.1.100:3000
```

### 3. Get iCloud App-Specific Password

CalDAV requires an **app-specific password** (not your regular iCloud password):

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to **Security** → **App-Specific Passwords**
4. Click **Generate Password**
5. Enter a label: "Family Planner CalDAV"
6. Copy the generated password (e.g., `xxxx-xxxx-xxxx-xxxx`)
7. Paste it into `.env` as `CALDAV_PASSWORD`

### 4. Start the Server

```bash
npm start
```

The server will run on **http://localhost:3002**

Check health: http://localhost:3002/health

## API Endpoints

### Family Members
- `GET /api/family-members` - Get all members
- `POST /api/family-members` - Add member
- `PUT /api/family-members/:id` - Update member
- `DELETE /api/family-members/:id` - Delete member

### Meals
- `GET /api/meals?date=2025-11-20` - Get meals for date
- `GET /api/meals?startDate=2025-11-20&endDate=2025-11-27` - Get meals for range
- `POST /api/meals` - Add meal
- `PUT /api/meals/:id` - Update meal
- `DELETE /api/meals/:id` - Delete meal

### Shopping Lists
- `GET /api/lists` - Get all lists with items
- `POST /api/lists` - Create list
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list
- `POST /api/lists/:listId/items` - Add item
- `PUT /api/lists/:listId/items/:itemId` - Update item
- `DELETE /api/lists/:listId/items/:itemId` - Delete item

### Calendar Events (CalDAV)
- `GET /api/events?startDate=2025-11-20&endDate=2025-11-27` - Sync and get events

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings/:key` - Update setting

## Network Deployment (Windows PC)

### On Windows PC:

1. **Install Node.js**: https://nodejs.org (LTS version)

2. **Copy backend folder** to Windows PC

3. **Edit `.env`**:
   ```env
   # Use Windows PC's IP address
   CORS_ORIGIN=http://192.168.1.100:3000,http://192.168.1.101:3000
   ```

4. **Find Windows PC IP**:
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., `192.168.1.50`)

5. **Start server**:
   ```cmd
   cd family-planner-backend
   npm install
   npm start
   ```

6. **Allow firewall** (if prompted):
   - Windows will ask to allow Node.js
   - Click "Allow access"

### On Tablets (Update Frontend):

Edit `family-planner/src/services/api.js`:

```javascript
const API_BASE_URL = 'http://192.168.1.50:3002'; // Use Windows PC IP
```

## CalDAV How It Works

1. **Universal Protocol** - CalDAV works on Mac, Windows, Linux
2. **Direct Connection** - Connects to iCloud Calendar servers
3. **No AppleScript** - Pure JavaScript implementation
4. **Caching** - Events cached in SQLite for offline access
5. **Auto-Sync** - Syncs every 5 minutes (configurable)

## Troubleshooting

### "CalDAV initialization failed"

**Common causes:**
- Wrong Apple ID or app-specific password
- Need to enable 2-factor authentication on Apple ID
- Need to generate app-specific password (see Setup step 3)

### "CORS error" from frontend

**Solution:** Add your device IP to `CORS_ORIGIN` in `.env`:
```env
CORS_ORIGIN=http://localhost:3000,http://192.168.1.100:3000,http://192.168.1.101:3000
```

### Can't connect from tablets

**Check:**
1. Windows PC firewall allows port 3002
2. All devices on same WiFi network
3. Using correct Windows PC IP address in frontend

## Production Deployment

For production, use PM2 to keep server running:

```bash
npm install -g pm2
pm2 start server.js --name family-planner-backend
pm2 save
pm2 startup
```

Server will auto-restart after reboots.

## Data Location

All data stored in: `./data/family-planner.db`

**Backup:** Just copy this file!

## Next Steps

1. ✅ Backend server running
2. ⏳ Update React frontend to use API (see frontend migration guide)
3. ⏳ Deploy to Windows PC
4. ⏳ Connect tablets to Windows PC IP
