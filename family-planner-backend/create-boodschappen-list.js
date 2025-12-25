require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const username = process.env.CALDAV_USERNAME;
const password = process.env.CALDAV_PASSWORD;

const auth = {
  username: username,
  password: password
};

async function createBoodschappenList() {
  try {
    console.log('🔨 Creating Boodschappen reminder list via CalDAV...\n');
    
    // Generate a UUID for the new list
    const listId = crypto.randomUUID().toLowerCase();
    const listUrl = `https://caldav.icloud.com/199294045/calendars/${listId}/`;
    
    console.log(`Creating list with UUID: ${listId}`);
    console.log(`Creating list with URL: ${listUrl}\n`);
    
    // Create the list using MKCOL (directory creation)
    const response = await axios({
      method: 'MKCOL',
      url: listUrl,
      auth: auth,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8'
      }
    });
    
    console.log('✅ Directory created!');
    console.log('Status:', response.status);
    
    // Now set properties with PROPPATCH
    const proppatchResponse = await axios({
      method: 'PROPPATCH',
      url: listUrl,
      auth: auth,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8'
      },
      data: `<?xml version="1.0" encoding="UTF-8"?>
<propertyupdate xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:I="http://apple.com/ns/ical/">
  <set>
    <prop>
      <resourcetype>
        <collection/>
        <C:calendar/>
      </resourcetype>
      <displayname>Boodschappen</displayname>
      <C:calendar-description>Shopping list synced with Family Planner</C:calendar-description>
      <C:supported-calendar-component-set>
        <C:comp name="VTODO"/>
      </C:supported-calendar-component-set>
      <I:calendar-color>#34C759FF</I:calendar-color>
    </prop>
  </set>
</propertyupdate>`
    });
    
    console.log('✅ List configured successfully!\n');
    console.log('Status:', proppatchResponse.status);
    console.log('\n📱 Open in Reminders app:');
    console.log(`   reminders://list/${listId}`);
    console.log('\n📋 List details:');
    console.log(`   Name: Boodschappen`);
    console.log(`   UUID: ${listId}`);
    console.log(`   CalDAV URL: ${listUrl}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data ? error.response.data.substring(0, 500) : 'none');
    }
  }
}

createBoodschappenList();
