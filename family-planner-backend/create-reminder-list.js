require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

async function createReminderList() {
  console.log('Creating new reminder list in iCloud...\n');
  
  const auth = {
    username: process.env.CALDAV_USERNAME,
    password: process.env.CALDAV_PASSWORD
  };
  
  // Generate a unique ID for the new calendar
  const calendarId = crypto.randomUUID();
  const listName = 'Family Shopping App';
  const listColor = '#00C853FF'; // Green color
  
  const calendarUrl = `https://caldav.icloud.com/199294045/calendars/${calendarId}/`;
  
  console.log(`Creating list: ${listName}`);
  console.log(`Calendar ID: ${calendarId}`);
  console.log(`URL: ${calendarUrl}\n`);
  
  try {
    // Step 1: Create the calendar collection with MKCALENDAR
    const mkCalendarResponse = await axios({
      method: 'MKCALENDAR',
      url: calendarUrl,
      auth: auth,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8'
      },
      data: `<?xml version="1.0" encoding="utf-8" ?>
<C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:set>
    <D:prop>
      <D:displayname>${listName}</D:displayname>
      <C:calendar-description>Synced shopping list from Family Planner</C:calendar-description>
      <C:supported-calendar-component-set>
        <C:comp name="VTODO"/>
      </C:supported-calendar-component-set>
      <x1:calendar-color xmlns:x1="http://apple.com/ns/ical/">${listColor}</x1:calendar-color>
    </D:prop>
  </D:set>
</C:mkcalendar>`
    });
    
    console.log('✓ Calendar collection created!');
    console.log(`  Status: ${mkCalendarResponse.status}`);
    
    // Step 2: Verify it was created by fetching it
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for sync
    
    const { createDAVClient } = require('tsdav');
    const client = await createDAVClient({
      serverUrl: process.env.CALDAV_SERVER_URL,
      credentials: {
        username: process.env.CALDAV_USERNAME,
        password: process.env.CALDAV_PASSWORD
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    });
    
    const calendars = await client.fetchCalendars();
    const newList = calendars.find(cal => cal.displayName === listName);
    
    if (newList) {
      console.log('\n✓✓✓ SUCCESS! ✓✓✓');
      console.log(`\nNew reminder list created and synced to iCloud!`);
      console.log(`  Name: ${newList.displayName}`);
      console.log(`  URL: ${newList.url}`);
      console.log(`  Components: ${newList.components?.join(', ')}`);
      console.log(`\nThis list should now appear on your iPhone in the Reminders app.`);
      console.log(`You can rename it to "Boodschappen" if you prefer.`);
    } else {
      console.log('\n⚠️  List created but not yet visible. Wait a few seconds and check your iPhone.');
    }
    
  } catch (error) {
    console.error('✗ Error creating calendar:');
    console.error(`  Status: ${error.response?.status}`);
    console.error(`  Message: ${error.message}`);
    if (error.response?.data) {
      console.error(`  Response: ${error.response.data.substring(0, 500)}`);
    }
  }
}

createReminderList();
