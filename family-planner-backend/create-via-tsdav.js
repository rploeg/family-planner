require('dotenv').config();
const { createDAVClient } = require('tsdav');
const crypto = require('crypto');

async function createBoodschappenList() {
  try {
    console.log('🔨 Creating Boodschappen reminder list via tsdav...\n');
    
    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: process.env.CALDAV_USERNAME,
        password: process.env.CALDAV_PASSWORD
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    });

    console.log('✓ Client created');
    
    // Generate a UUID for the new list
    const listId = crypto.randomUUID().toLowerCase();
    
    console.log(`Creating list with UUID: ${listId}\n`);
    
    // Use makeCalendar to create the list
    const calendarUrl = `https://caldav.icloud.com/199294045/calendars/${listId}/`;
    
    try {
      const result = await client.makeCalendar({
        url: calendarUrl,
        props: {
          displayname: 'Boodschappen',
          'calendar-description': 'Shopping list synced with Family Planner',
          'supported-calendar-component-set': {
            comp: { name: 'VTODO' }
          }
        }
      });
      
      console.log('✅ List created successfully!\n');
      console.log('Result:', result);
      console.log('\n📋 List details:');
      console.log(`   Name: Boodschappen`);
      console.log(`   UUID: ${listId}`);
      console.log(`   CalDAV URL: ${calendarUrl}`);
      console.log('\n🔄 List should appear in Reminders app within 30 seconds');
      
    } catch (err) {
      console.error('Failed with makeCalendar:', err.message);
      console.error('Error details:', err);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createBoodschappenList();
