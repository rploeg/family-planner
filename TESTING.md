# Family Planner - Test Strategy

## Quick Pre-Deploy Checklist

Run through this checklist before deploying to production.

### 1. Backend Health Check
```bash
# Check backend is running
curl -s "http://localhost:3002/api/status"

# Check Loxone connection
curl -s "http://localhost:3002/api/loxone/status" | jq '.connected'

# Check calendar events load
curl -s "http://localhost:3002/api/events?startDate=$(date +%Y-%m-%d)&endDate=$(date -v+7d +%Y-%m-%d)" | jq '.events | length'

# Check lists load
curl -s "http://localhost:3002/api/lists" | jq '.[].name'

# Check meals load
curl -s "http://localhost:3002/api/meals" | jq 'length'
```

### 2. Frontend Build Check
```bash
cd family-planner
npm run build
# Should complete without errors
```

---

## Feature Test Cases

### 📅 Briefing Page (Homepage)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Open app at `/` | Briefing page displays without errors |
| Calendar events show | Check "Today" section | Events for today appear with times |
| All-day events | Check events marked "Hele dag" | All-day events show at top |
| Loxone status | Check presence indicators | Shows who's home/away with icons |
| Loxone sensors | Check sensor data | Temperature, energy data displays |
| Tasks due today | Add task with today's due date | Task appears on briefing page |

### 📋 Lists Page

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Lists load | Navigate to Lists tab | All lists appear (Boodschappen, Taken, etc.) |
| Switch lists | Click different list | Items update to selected list |
| Add item | Type item, press Enter or + | Item added to list |
| Complete item | Tap checkbox | Item moves to completed section |
| Delete item | Swipe/long-press item | Item removed |
| Recipe button | Click recipe icon (🍳) | Recipe modal opens |
| Search recipe | Type "chicken", search | Recipe results appear |
| Add ingredients | Select ingredients, click add | Items added to Boodschappen list |
| Meal planning | Select date + meal type, add | Meal appears in week view |

### 📅 Calendar Page

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Calendar loads | Navigate to Calendar tab | Calendar grid displays |
| Events show | Check days with events | Event dots/indicators visible |
| Day view | Tap a day | Events for that day display |
| Event details | Tap an event | Event details show (no calendar label) |
| Automation badge | Check event with automation | 🏠 badge appears |

### 📆 Week View

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Week displays | Navigate to Week tab | 7 days shown with events |
| Navigate weeks | Use arrows or swipe | Previous/next week loads |
| Events show | Check day columns | Events appear under correct days |
| Meals show | Check meals section | Planned meals appear |
| Tasks with due date | Add task with due date | Task appears on correct day |
| Tap event | Click an event | Event details display |

### 🍳 Recipe Modal

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Open modal | Click recipe button | Modal opens with search |
| Random recipe | Click 🎲 button | Random recipe loads |
| Search recipe | Type name, click 🔍 | Results appear |
| Browse category | Click a category | Category recipes load |
| View recipe | Click a recipe card | Recipe details show |
| Select ingredients | Check/uncheck items | Selection updates |
| Select all | Click "Select all" | All ingredients selected |
| Meal date picker | Change date field | Date updates |
| Meal type | Change dropdown | Type updates (breakfast/lunch/dinner) |
| Add to list | Click "Add ingredients" | Modal closes, items in Boodschappen |
| Meal added | Check week view | Meal appears on selected date |

### 🏠 Loxone Integration

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Connection status | Check briefing page | Loxone data loads (not "connecting...") |
| Presence detection | Check who's home | Correct presence indicators |
| Temperature sensors | Check sensor values | Temperature values display |
| Energy data | Check P1 meter | Power usage shows |

---

## API Endpoint Tests

Run these curl commands to verify backend functionality:

```bash
# === Status ===
curl -s "http://localhost:3002/api/status"
# Expected: {"status":"ok"}

# === Calendar Events ===
curl -s "http://localhost:3002/api/events?startDate=2025-01-01&endDate=2025-01-31" | jq '.events | length'
# Expected: Number > 0

# === Lists ===
curl -s "http://localhost:3002/api/lists" | jq '.[0] | {id, name, type}'
# Expected: List object with id, name, type

# === List Items ===
LIST_ID=$(curl -s "http://localhost:3002/api/lists" | jq -r '.[0].id')
curl -s "http://localhost:3002/api/lists/$LIST_ID/items" | jq 'length'
# Expected: Number >= 0

# === Add List Item ===
curl -s -X POST "http://localhost:3002/api/lists/$LIST_ID/items" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item", "completed": false}' | jq .
# Expected: Created item object

# === Meals ===
curl -s "http://localhost:3002/api/meals" | jq 'length'
# Expected: Number >= 0

# === Add Meal ===
curl -s -X POST "http://localhost:3002/api/meals" \
  -H "Content-Type: application/json" \
  -d '{"id": "test-'$(date +%s)'", "date": "'$(date +%Y-%m-%d)'", "title": "Test Meal", "type": "dinner"}' | jq .
# Expected: Created meal object

# === Tasks with due dates ===
curl -s "http://localhost:3002/api/tasks/due" | jq 'length'
# Expected: Number >= 0
curl -s "http://localhost:3002/api/loxone/status" | jq '{connected, users: .users | length}'
# Expected: {connected: true, users: N}

# === Loxone Sensors ===
curl -s "http://localhost:3002/api/loxone/sensors" | jq 'keys'
# Expected: Array of sensor categories
```

---

## Common Issues & Fixes

### Backend won't start
```bash
# Check if port is in use
lsof -i :3002 | grep LISTEN

# Kill existing process
kill $(lsof -t -i :3002)

# Restart
cd family-planner-backend && node server.js
```

### Frontend won't start
```bash
# Check if port is in use
lsof -i :3000 | grep LISTEN

# Kill existing process
kill $(lsof -t -i :3000)

# Restart
cd family-planner && npm start
```

### Loxone not connecting
1. Check `.env` file has correct credentials
2. Verify Loxone Miniserver is accessible on network
3. Check backend logs for connection errors

### Calendar events not loading
1. Check CalDAV credentials in `.env`
2. Verify Apple Calendar is accessible
3. Check backend logs for CalDAV errors

### Database issues
```bash
# Check database exists
ls -la family-planner-backend/data/

# Reset database (WARNING: deletes all data)
rm family-planner-backend/data/family-planner.db
# Restart backend to recreate
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Run `npm run build` in `family-planner/` - no errors
- [ ] All API endpoint tests pass
- [ ] Backend connects to Loxone
- [ ] Calendar events load
- [ ] Lists and items work
- [ ] Recipe search and add works
- [ ] Meal planning works
- [ ] No console errors in browser
- [ ] Git is clean (`git status` shows nothing to commit)
- [ ] Changes are pushed (`git push`)

---

## Automated Test Script

Save and run this script for quick validation:

```bash
#!/bin/bash
# test-api.sh - Quick API validation

BASE_URL="http://localhost:3002"
ERRORS=0

echo "🧪 Testing Family Planner API..."
echo ""

# Test status
echo -n "Status endpoint: "
if curl -sf "$BASE_URL/api/status" > /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED"
  ((ERRORS++))
fi

# Test events
echo -n "Events endpoint: "
COUNT=$(curl -sf "$BASE_URL/api/events?startDate=2025-01-01&endDate=2025-12-31" | jq '.events | length' 2>/dev/null)
if [ "$COUNT" -gt 0 ] 2>/dev/null; then
  echo "✅ OK ($COUNT events)"
else
  echo "❌ FAILED"
  ((ERRORS++))
fi

# Test lists
echo -n "Lists endpoint: "
COUNT=$(curl -sf "$BASE_URL/api/lists" | jq 'length' 2>/dev/null)
if [ "$COUNT" -gt 0 ] 2>/dev/null; then
  echo "✅ OK ($COUNT lists)"
else
  echo "❌ FAILED"
  ((ERRORS++))
fi

# Test meals
echo -n "Meals endpoint: "
if curl -sf "$BASE_URL/api/meals" > /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED"
  ((ERRORS++))
fi

# Test Loxone
echo -n "Loxone status: "
CONNECTED=$(curl -sf "$BASE_URL/api/loxone/status" | jq '.connected' 2>/dev/null)
if [ "$CONNECTED" = "true" ]; then
  echo "✅ Connected"
else
  echo "⚠️  Not connected"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ All core tests passed!"
  exit 0
else
  echo "❌ $ERRORS test(s) failed"
  exit 1
fi
```

Make it executable:
```bash
chmod +x test-api.sh
./test-api.sh
```
