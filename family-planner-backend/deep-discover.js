require('dotenv').config();
const { createDAVClient } = require('tsdav');

async function discoverReminders() {
  try {
    console.log('🔍 Discovering all reminder lists...\n');
    
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
    console.log('Account info:', JSON.stringify(client.account, null, 2));
    
    // Fetch all calendars
    const calendars = await client.fetchCalendars();
    
    console.log(`\n📋 Found ${calendars.length} calendars/lists:\n`);
    
    calendars.forEach((cal, index) => {
      console.log(`\n${index + 1}. ${cal.displayName || 'Unnamed'}`);
      console.log(`   URL: ${cal.url}`);
      console.log(`   Components: ${cal.components ? cal.components.join(', ') : 'unknown'}`);
      console.log(`   Description: ${cal.description || 'none'}`);
      console.log(`   CTag: ${cal.ctag || 'none'}`);
      console.log(`   Sync Token: ${cal.syncToken || 'none'}`);
      console.log(`   Timezone: ${cal.timezone || 'none'}`);
      
      // Check for VTODO support
      if (cal.components && cal.components.includes('VTODO')) {
        console.log(`   ✅ REMINDER/TASK LIST`);
      }
      
      // Print all properties
      console.log(`   All properties:`, Object.keys(cal));
    });
    
    // Try to fetch objects from each VTODO calendar
    console.log('\n\n🔍 Checking for objects in VTODO calendars...\n');
    
    for (const cal of calendars) {
      if (cal.components && cal.components.includes('VTODO')) {
        console.log(`\nChecking: ${cal.displayName}`);
        try {
          const objects = await client.fetchCalendarObjects({
            calendar: cal,
            objectType: 'VTODO'
          });
          console.log(`  Found ${objects.length} reminders`);
          
          if (objects.length > 0) {
            console.log(`  Sample reminder:`, objects[0].data.substring(0, 200));
          }
        } catch (err) {
          console.log(`  Error fetching objects: ${err.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

discoverReminders();
