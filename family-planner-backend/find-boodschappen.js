require('dotenv').config();
const axios = require('axios');

async function findBoodschappen() {
  console.log('Searching for Boodschappen list...\n');
  
  const auth = {
    username: process.env.CALDAV_USERNAME,
    password: process.env.CALDAV_PASSWORD
  };
  
  // Try different possible endpoints
  const endpoints = [
    'https://caldav.icloud.com/199294045/calendars/',
    'https://caldav.icloud.com/199294045/reminders/',
    'https://p106-caldav.icloud.com/199294045/calendars/',
    'https://caldav.icloud.com/199294045/',
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTrying: ${endpoint}`);
    try {
      const response = await axios({
        method: 'PROPFIND',
        url: endpoint,
        auth: auth,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Depth': '1'
        },
        data: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:displayname/>
            </D:prop>
          </D:propfind>`
      });
      
      // Look for "Boodschappen" in response
      if (response.data.includes('Boodschappen') || response.data.includes('boodschappen')) {
        console.log('  ✓ FOUND Boodschappen!');
        console.log('\n  Full response:');
        console.log(response.data);
        
        // Extract the href for Boodschappen
        const lines = response.data.split('\n');
        let foundBoodschappen = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('Boodschappen')) {
            // Look backwards for href
            for (let j = i; j >= Math.max(0, i - 10); j--) {
              if (lines[j].includes('<D:href>')) {
                console.log('\n  Boodschappen URL:', lines[j].match(/<D:href>([^<]+)<\/D:href>/)[1]);
                foundBoodschappen = true;
                break;
              }
            }
            if (foundBoodschappen) break;
          }
        }
      } else {
        // Show what we found
        const names = response.data.match(/<D:displayname[^>]*>([^<]+)<\/D:displayname>/gi) || [];
        console.log(`  Found ${names.length} lists:`);
        names.forEach(name => {
          console.log(`    - ${name.replace(/<[^>]+>/g, '')}`);
        });
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }
}

findBoodschappen();
