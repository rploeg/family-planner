#!/bin/bash
# test-api.sh - Quick API validation for Family Planner

BASE_URL="${1:-http://localhost:3002}"
ERRORS=0
WARNINGS=0

echo "🧪 Testing Family Planner API at $BASE_URL"
echo "============================================"
echo ""

# Test status
echo -n "📡 Status endpoint: "
if curl -sf "$BASE_URL/api/status" > /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED - Backend not running?"
  ((ERRORS++))
fi

# Test events
echo -n "📅 Events endpoint: "
EVENTS_RESPONSE=$(curl -sf "$BASE_URL/api/events?startDate=2025-01-01&endDate=2025-12-31" 2>/dev/null)
if [ $? -eq 0 ]; then
  COUNT=$(echo "$EVENTS_RESPONSE" | jq '.events | length' 2>/dev/null)
  if [ "$COUNT" -gt 0 ] 2>/dev/null; then
    echo "✅ OK ($COUNT events)"
  else
    echo "⚠️  OK but 0 events"
    ((WARNINGS++))
  fi
else
  echo "❌ FAILED"
  ((ERRORS++))
fi

# Test lists
echo -n "📋 Lists endpoint: "
LISTS_RESPONSE=$(curl -sf "$BASE_URL/api/lists" 2>/dev/null)
if [ $? -eq 0 ]; then
  COUNT=$(echo "$LISTS_RESPONSE" | jq 'length' 2>/dev/null)
  if [ "$COUNT" -gt 0 ] 2>/dev/null; then
    echo "✅ OK ($COUNT lists)"
    
    # Test list items
    LIST_ID=$(echo "$LISTS_RESPONSE" | jq -r '.[0].id')
    echo -n "   └─ List items: "
    ITEMS_COUNT=$(curl -sf "$BASE_URL/api/lists/$LIST_ID/items" | jq 'length' 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo "✅ OK ($ITEMS_COUNT items)"
    else
      echo "❌ FAILED"
      ((ERRORS++))
    fi
  else
    echo "⚠️  OK but 0 lists"
    ((WARNINGS++))
  fi
else
  echo "❌ FAILED"
  ((ERRORS++))
fi

# Test meals
echo -n "🍽️  Meals endpoint: "
MEALS_RESPONSE=$(curl -sf "$BASE_URL/api/meals" 2>/dev/null)
if [ $? -eq 0 ]; then
  COUNT=$(echo "$MEALS_RESPONSE" | jq 'length' 2>/dev/null)
  echo "✅ OK ($COUNT meals)"
else
  echo "❌ FAILED"
  ((ERRORS++))
fi

# Test Loxone status
echo -n "🏠 Loxone status: "
LOXONE_RESPONSE=$(curl -sf "$BASE_URL/api/loxone/status" 2>/dev/null)
if [ $? -eq 0 ]; then
  CONNECTED=$(echo "$LOXONE_RESPONSE" | jq '.connected' 2>/dev/null)
  USERS=$(echo "$LOXONE_RESPONSE" | jq '.users | length' 2>/dev/null)
  if [ "$CONNECTED" = "true" ]; then
    echo "✅ Connected ($USERS users)"
  else
    echo "⚠️  Not connected"
    ((WARNINGS++))
  fi
else
  echo "❌ FAILED"
  ((ERRORS++))
fi

# Test Loxone sensors
echo -n "🌡️  Loxone sensors: "
SENSORS_RESPONSE=$(curl -sf "$BASE_URL/api/loxone/sensors" 2>/dev/null)
if [ $? -eq 0 ]; then
  CATEGORIES=$(echo "$SENSORS_RESPONSE" | jq 'keys | length' 2>/dev/null)
  echo "✅ OK ($CATEGORIES categories)"
else
  echo "⚠️  Not available"
  ((WARNINGS++))
fi

# Test tasks with due date
echo -n "📌 Tasks with due dates: "
TASKS_RESPONSE=$(curl -sf "$BASE_URL/api/tasks/due" 2>/dev/null)
if [ $? -eq 0 ]; then
  COUNT=$(echo "$TASKS_RESPONSE" | jq 'length' 2>/dev/null)
  echo "✅ OK ($COUNT tasks)"
else
  echo "⚠️  Endpoint may not exist"
  ((WARNINGS++))
fi

echo ""
echo "============================================"
if [ $ERRORS -eq 0 ]; then
  if [ $WARNINGS -gt 0 ]; then
    echo "✅ All core tests passed! ($WARNINGS warnings)"
  else
    echo "✅ All tests passed!"
  fi
  exit 0
else
  echo "❌ $ERRORS test(s) failed, $WARNINGS warning(s)"
  exit 1
fi
