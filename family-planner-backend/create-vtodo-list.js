require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const username = process.env.CALDAV_USERNAME;
const password = process.env.CALDAV_PASSWORD;

const auth = {
  username: username,
  password: password
};

async function createBoodschappenReminders() {
  try {
    console.log('🔨 Creating Boodschappen REMINDER list with proper VTODO support...\n');
    
    const listId = crypto.randomUUID().toLowerCase();
    const listUrl = `https://caldav.icloud.com/199294045/calendars/${listId}/`;
    
    console.log(`Creating list: ${listId}\n`);
    
    // Use MKCALENDAR with proper VTODO component specification
    const response = await axios({
      method: 'MKCALENDAR',
      url: listUrl,
      auth: auth,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '0'
      },
      data: `<?xml version="1.0" encoding="UTF-8"?>
<B:mkcalendar xmlns:B="urn:ietf:params:xml:ns:caldav" xmlns:A="DAV:" xmlns:C="http://apple.com/ns/ical/">
  <A:set>
    <A:prop>
      <A:displayname>Boodschappen</A:displayname>
      <C:calendar-color>#34C759FF</C:calendar-color>
      <B:calendar-description>Shopping list synced with Family Planner</B:calendar-description>
      <B:supported-calendar-component-set>
        <B:comp name="VTODO"/>
      </B:supported-calendar-component-set>
    </A:prop>
  </A:set>
</B:mkcalendar>`
    });
    
    console.log('✅ Reminder list created!\n');
    console.log('Status:', response.status);
    console.log('\n📋 List details:');
    console.log(`   Name: Boodschappen`);
    console.log(`   UUID: ${listId}`);
    console.log(`   CalDAV URL: ${listUrl}`);
    console.log('\n🔄 Check your Reminders app - should appear within 30 seconds');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

createBoodschappenReminders();
