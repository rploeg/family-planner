require('dotenv').config();
const { createDAVClient } = require('tsdav');

async function findTest22() {
  console.log('Searching for Test22 item in all reminder lists...\n');
  
  try {
    const client = await createDAVClient({
      serverUrl: process.env.CALDAV_SERVER_URL,
      credentials: {
        username: process.env.CALDAV_USERNAME,
        password: process.env.CALDAV_PASSWORD
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    });

    console.log('✓ Connected\n');
    
    const calendars = await client.fetchCalendars();
    
    for (const cal of calendars) {
      console.log(`\nChecking: ${cal.displayName || cal.url}`);
      console.log(`  Components: ${cal.components?.join(', ') || 'none'}`);
      
      try {
        const objects = await client.fetchCalendarObjects({
          calendar: cal
        });
        
        console.log(`  Objects: ${objects.length}`);
        
        // Look for Test22 in any object
        for (const obj of objects) {
          if (obj.data && (obj.data.includes('Test22') || obj.data.includes('test22'))) {
            console.log('\n  ✓✓✓ FOUND Test22! ✓✓✓\n');
            console.log('  Full object data:');
            console.log(obj.data);
            console.log('\n  Calendar URL:', cal.url);
            console.log('  Calendar display name:', cal.displayName);
            console.log('  Object URL:', obj.url);
            return;
          }
        }
        
        // If VTODO list, show what items are in it
        if (cal.components && cal.components.includes('VTODO') && objects.length > 0) {
          console.log('  VTODO items in this list:');
          for (const obj of objects) {
            if (obj.data && obj.data.includes('BEGIN:VTODO')) {
              const summaryMatch = obj.data.match(/SUMMARY:([^\r\n]+)/);
              if (summaryMatch) {
                console.log(`    - ${summaryMatch[1]}`);
              }
            }
          }
        }
        
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }
    
    console.log('\n\nTest22 not found in any calendar');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTest22();
