# iPhone Reminders Integration

## Overview

The Family Planner app now syncs bidirectionally with iPhone Reminders via iCloud CalDAV.

## How It Works

### Sync Setup

- **Reminder List**: "Family Shopping App" (created via CalDAV)
- **Sync Interval**: Every 3 minutes (configurable via `REMINDERS_SYNC_INTERVAL` in `.env`)
- **Protocol**: CalDAV (VTODO format)

### Data Mapping

#### App → iPhone Reminders

- `text` → **SUMMARY** (item name)
- `checked` → **STATUS** (NEEDS-ACTION / COMPLETED)
- `category` → **CATEGORIES** (food, household, health, kids, pets)
- `forMeal` + `addedBy` → **DESCRIPTION** (notes field)

#### Description Format

When you add an item from a meal suggestion:

```text
🍽️ Voor Pizza maken samen
👤 Papa
```

### Sync Behavior

1. **App → iPhone**:
   - New items created in app appear in iPhone Reminders
   - Checking items in app marks them complete on iPhone
   - Deleting items in app removes them from iPhone

2. **iPhone → App**:
   - New items added on iPhone appear in app
   - Checking items on iPhone updates app status
   - Deleting items on iPhone removes them from app

3. **Conflict Resolution**:
   - If both sides change an item, iPhone version wins
   - Timestamp-based conflict detection
   - Conflicts are logged in sync result

### Manual Sync

Trigger a manual sync via API:

```bash
curl -X POST http://localhost:3002/api/reminders/sync
```

### Check Sync Status

```bash
curl http://localhost:3002/api/reminders/status
```

### View Available Lists

```bash
curl http://localhost:3002/api/reminders/lists
```

## Configuration

### Environment Variables

```env
# Reminder Sync Interval (minutes)
REMINDERS_SYNC_INTERVAL=3

# iCloud Calendar (CalDAV) credentials
CALDAV_SERVER_URL=https://caldav.icloud.com
CALDAV_USERNAME=your-icloud-email@example.com
CALDAV_PASSWORD=your-app-specific-password
```

### App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in → Security → App-Specific Passwords
3. Generate new password for "Family Planner CalDAV"
4. Use this password in `.env` file

## Database Schema

The `shopping_list_items` table includes:

- `icloudId` - UUID of the reminder in iCloud
- `lastSynced` - Timestamp of last sync
- `forMeal` - Which meal the ingredient is for
- `addedBy` - Who added the item
- `category` - Item category (food, household, etc.)

## Limitations

### Groceries-Type Lists

Apple's "Groceries" template lists use a proprietary API and don't sync via standard CalDAV. Use "Standard" list type instead.

### Sync Delay

Changes may take a few seconds to sync, depending on:

- Network connectivity
- iCloud sync status
- Server sync interval

## Troubleshooting

### List Not Appearing on iPhone

- Check iCloud Settings → Reminders is ON
- Wait 10-30 seconds for iCloud sync
- Force quit and reopen Reminders app

### Items Not Syncing

- Check server logs: `tail -f /tmp/server.log`
- Verify CalDAV credentials in `.env`
- Check sync status endpoint
- Trigger manual sync

### Creating New Reminder List

If you need to create a new list:

```bash
cd family-planner-backend
node create-reminder-list.js
```

Then update `listName` in `ReminderSyncService.js`

## Architecture

```text
┌─────────────────┐
│  Family Planner │
│      App        │
└────────┬────────┘
         │
         │ HTTP API
         ▼
┌─────────────────┐         ┌──────────────┐
│  Node.js Server │ ◄─────► │    SQLite    │
│                 │         │   Database   │
└────────┬────────┘         └──────────────┘
         │
         │ CalDAV Protocol
         ▼
┌─────────────────┐         ┌──────────────┐
│  iCloud CalDAV  │ ◄─────► │   iPhone     │
│     Server      │  Sync   │  Reminders   │
└─────────────────┘         └──────────────┘
```

## Files

- `services/CalDAVService.js` - CalDAV client for iCloud
- `services/ReminderSyncService.js` - Bidirectional sync logic
- `database/DatabaseManager.js` - Database schema with sync columns
- `server.js` - API endpoints for reminder sync
- `create-reminder-list.js` - Utility to create new reminder lists
