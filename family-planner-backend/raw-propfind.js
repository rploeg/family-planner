require('dotenv').config();
const axios = require('axios');

const calendarUrl = 'https://caldav.icloud.com/199294045/calendars/7b07ffa4-70a9-44c4-9fbd-e4fd6fa5116e/';
const username = process.env.CALDAV_USERNAME;
const password = process.env.CALDAV_PASSWORD;

const propfindBody = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <d:getcontenttype />
    <c:calendar-data />
  </d:prop>
</d:propfind>`;

(async () => {
  try {
    console.log('🔍 Fetching objects from:', calendarUrl);
    
    const response = await axios({
      method: 'PROPFIND',
      url: calendarUrl,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1'
      },
      auth: {
        username,
        password
      },
      data: propfindBody
    });
    
    const responseText = response.data;
    
    // Count how many VTODO items are in the response
    const vtodoMatches = responseText.match(/BEGIN:VTODO/g);
    const vtodoCount = vtodoMatches ? vtodoMatches.length : 0;
    
    console.log(`\n✅ Found ${vtodoCount} VTODO items\n`);
    
    if (vtodoCount > 0) {
      // Extract and display each SUMMARY
      const summaryRegex = /SUMMARY:([^\r\n]+)/g;
      let match;
      let i = 1;
      while ((match = summaryRegex.exec(responseText)) !== null) {
        console.log(`  ${i}. ${match[1]}`);
        i++;
      }
    } else {
      console.log('  (no items found)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data.substring(0, 500));
    }
  }
})();
