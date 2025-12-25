require('dotenv').config();
const axios = require('axios');

const username = process.env.CALDAV_USERNAME;
const password = process.env.CALDAV_PASSWORD;

const auth = {
  username: username,
  password: password
};

async function discoverReminders() {
  try {
    console.log('🔍 Discovering reminder lists via CalDAV...\n');
    
    // Step 1: Get principal URL
    console.log('Step 1: Finding principal URL...');
    const principalResponse = await axios({
      method: 'PROPFIND',
      url: 'https://caldav.icloud.com',
      auth: auth,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '0'
      },
      data: `<?xml version="1.0" encoding="UTF-8"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:current-user-principal />
          </d:prop>
        </d:propfind>`
    });
    
    const principalMatch = principalResponse.data.match(/<current-user-principal><href>(.+?)<\/href>/);
    let principalUrl = principalMatch ? principalMatch[1] : null;
    
    // If no principal URL found, try default pattern
    if (!principalUrl) {
      principalUrl = `/${username.split('@')[0]}/principal/`;
      console.log('  Using default principal URL:', principalUrl);
    } else {
      console.log('  Principal URL:', principalUrl);
    }
    
    // Step 2: Get home set URLs
    console.log('\nStep 2: Finding calendar and task home sets...');
    const homeSetResponse = await axios({
      method: 'PROPFIND',
      url: `https://caldav.icloud.com${principalUrl}`,
      auth: auth,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '0'
      },
      data: `<?xml version="1.0" encoding="UTF-8"?>
        <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:prop>
            <c:calendar-home-set />
            <c:schedule-inbox-URL />
            <c:schedule-outbox-URL />
          </d:prop>
        </d:propfind>`
    });
    
    console.log('  Home set response:', homeSetResponse.data.substring(0, 500));
    
    const homeSetMatch = homeSetResponse.data.match(/<calendar-home-set><href>(.+?)<\/href>/);
    const homeSetUrl = homeSetMatch ? homeSetMatch[1] : null;
    console.log('  Calendar home set URL:', homeSetUrl);
    
    // Step 3: Get all calendars and task lists
    console.log('\nStep 3: Discovering all calendars and task lists...');
    const collectionsResponse = await axios({
      method: 'PROPFIND',
      url: `https://caldav.icloud.com${homeSetUrl}`,
      auth: auth,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1'
      },
      data: `<?xml version="1.0" encoding="UTF-8"?>
        <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/" xmlns:a="http://apple.com/ns/ical/">
          <d:prop>
            <d:resourcetype />
            <d:displayname />
            <a:calendar-color />
            <c:calendar-description />
            <c:supported-calendar-component-set />
            <cs:getctag />
          </d:prop>
        </d:propfind>`
    });
    
    // Parse the response to find all calendars
    const responses = collectionsResponse.data.split('<d:response>');
    
    console.log(`\n📋 Found ${responses.length - 1} collections:\n`);
    
    for (let i = 1; i < responses.length; i++) {
      const response = responses[i];
      
      // Extract href
      const hrefMatch = response.match(/<d:href>(.+?)<\/d:href>/);
      const href = hrefMatch ? hrefMatch[1] : '';
      
      // Extract display name
      const nameMatch = response.match(/<d:displayname>(.+?)<\/d:displayname>/);
      const displayName = nameMatch ? nameMatch[1] : 'Unnamed';
      
      // Extract supported components
      const vtodoMatch = response.includes('VTODO');
      const veventMatch = response.includes('VEVENT');
      
      // Extract color
      const colorMatch = response.match(/<a:calendar-color>(.+?)<\/a:calendar-color>/);
      const color = colorMatch ? colorMatch[1] : '';
      
      // Check if it's a calendar collection
      const isCalendar = response.includes('<c:calendar') || response.includes('calendar</');
      
      if (isCalendar) {
        console.log(`\n📅 ${displayName}`);
        console.log(`   URL: ${href}`);
        console.log(`   Supports: ${veventMatch ? 'VEVENT ' : ''}${vtodoMatch ? 'VTODO' : ''}`);
        if (color) console.log(`   Color: ${color}`);
        
        if (vtodoMatch) {
          console.log(`   ✅ This is a REMINDER/TASK list!`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

discoverReminders();
