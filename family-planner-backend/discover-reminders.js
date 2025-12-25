require('dotenv').config();
const { createDAVClient } = require('tsdav');

async function deepDiscovery() {
  console.log('Deep CalDAV Reminder Discovery\n');
  
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
    
    // Get account info
    console.log('Account Info:');
    console.log('  Server URL:', client.serverUrl);
    console.log('  Account URL:', client.account?.accountURL);
    console.log('  Principal URL:', client.account?.principalUrl);
    console.log('  Home URL:', client.account?.homeUrl);
    console.log('  Root URL:', client.account?.rootUrl);
    console.log('');
    
    // Method 1: Standard calendar fetch
    console.log('Method 1: Standard Calendar Fetch');
    const calendars = await client.fetchCalendars();
    console.log(`  Found ${calendars.length} calendars`);
    calendars.forEach(cal => {
      console.log(`    - ${cal.displayName} (${cal.components?.join(', ')})`);
    });
    console.log('');
    
    // Method 2: Try to query all collections under principal
    console.log('Method 2: Querying principal collections directly...');
    try {
      const axios = require('axios');
      const principalUrl = client.account?.principalUrl || `${process.env.CALDAV_SERVER_URL}/199294045/principal/`;
      
      const response = await axios({
        method: 'PROPFIND',
        url: principalUrl,
        auth: {
          username: process.env.CALDAV_USERNAME,
          password: process.env.CALDAV_PASSWORD
        },
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Depth': '1'
        },
        data: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
            <D:prop>
              <D:displayname/>
              <D:resourcetype/>
              <C:calendar-description/>
              <C:supported-calendar-component-set/>
            </D:prop>
          </D:propfind>`
      });
      
      console.log('  Principal response received');
      console.log('  Response:', response.data.substring(0, 500));
    } catch (err) {
      console.log('  Error querying principal:', err.message);
    }
    console.log('');
    
    // Method 3: Try the calendars collection directly
    console.log('Method 3: Trying calendars endpoint with full PROPFIND...');
    try {
      const axios = require('axios');
      const calendarsUrl = `${process.env.CALDAV_SERVER_URL}/199294045/calendars/`;
      
      const response = await axios({
        method: 'PROPFIND',
        url: calendarsUrl,
        auth: {
          username: process.env.CALDAV_USERNAME,
          password: process.env.CALDAV_PASSWORD
        },
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Depth': '1'
        },
        data: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
            <D:prop>
              <D:displayname/>
              <D:resourcetype/>
              <C:calendar-description/>
              <C:supported-calendar-component-set/>
            </D:prop>
          </D:propfind>`
      });
      
      console.log('  Calendars collection response:');
      // Parse and show all collection names
      const displayNames = response.data.match(/<D:displayname[^>]*>([^<]+)<\/D:displayname>/gi);
      if (displayNames) {
        displayNames.forEach(dn => {
          const name = dn.replace(/<[^>]+>/g, '');
          console.log(`    - ${name}`);
        });
      }
    } catch (err) {
      console.log('  Error:', err.message);
    }
    console.log('');
    
    // Method 4: List all URLs in response
    console.log('Method 4: Checking all href URLs...');
    try {
      const axios = require('axios');
      const calendarsUrl = `${process.env.CALDAV_SERVER_URL}/199294045/calendars/`;
      
      const response = await axios({
        method: 'PROPFIND',
        url: calendarsUrl,
        auth: {
          username: process.env.CALDAV_USERNAME,
          password: process.env.CALDAV_PASSWORD
        },
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Depth': '1'
        }
      });
      
      // Extract all hrefs
      const hrefs = response.data.match(/<D:href[^>]*>([^<]+)<\/D:href>/gi);
      if (hrefs) {
        console.log(`  Found ${hrefs.length} hrefs:`);
        hrefs.forEach(href => {
          const url = href.replace(/<[^>]+>/g, '');
          if (url.includes('calendars') && !url.endsWith('calendars/')) {
            console.log(`    ${url}`);
          }
        });
      }
    } catch (err) {
      console.log('  Error:', err.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

deepDiscovery();
