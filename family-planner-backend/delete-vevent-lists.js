require('dotenv').config();
const axios = require('axios');

const username = process.env.CALDAV_USERNAME;
const password = process.env.CALDAV_PASSWORD;

const auth = {
  username: username,
  password: password
};

// The two VEVENT "Boodschappen" calendars to delete
const calendarsToDelete = [
  {
    name: 'Boodschappen #1 (VEVENT)',
    uuid: '0063c3f1-cc67-4654-90c3-891b9aa9cfe1'
  },
  {
    name: 'Boodschappen #2 (VEVENT)',
    uuid: 'c17f9f78-9157-4934-b106-be996aedaa9d'
  }
];

async function deleteCalendar(calendar) {
  try {
    const url = `https://caldav.icloud.com/199294045/calendars/${calendar.uuid}/`;
    
    console.log(`Deleting: ${calendar.name}`);
    console.log(`  URL: ${url}`);
    
    const response = await axios({
      method: 'DELETE',
      url: url,
      auth: auth
    });
    
    console.log(`  ✓ Deleted (Status: ${response.status})\n`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to delete: ${error.message}`);
    if (error.response) {
      console.error(`    Status: ${error.response.status}`);
    }
    console.log('');
    return false;
  }
}

async function main() {
  console.log('🗑️  Removing VEVENT "Boodschappen" calendars...\n');
  
  for (const calendar of calendarsToDelete) {
    await deleteCalendar(calendar);
  }
  
  console.log('✓ Done! The VEVENT calendars should now be removed from your Calendar app.');
  console.log('✓ The VTODO "Boodschappen" list (6142835f...) is kept for Reminders sync.\n');
}

main();
