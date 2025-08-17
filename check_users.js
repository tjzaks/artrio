import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkUsers() {
  console.log('Checking all users in the system...\n');

  // Get all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('username');

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('=== ALL USERNAMES IN SYSTEM ===');
  profiles.forEach(profile => {
    console.log(`Username: "${profile.username}" (Admin: ${profile.is_admin})`);
  });

  console.log('\n=== LOGIN CREDENTIALS ===');
  console.log('Tyler: username="tyler", password="Claude&Cursor4Life!"');
  console.log('Jonny B: username="Jonny B", password="test123456"');
  console.log('Others: username="[see above]", password="test123456"');
  
  console.log('\n=== CHECKING FOR "dev" USERNAME ===');
  const devUser = profiles.find(p => p.username === 'dev' || p.username === 'Dev' || p.username === 'DEV');
  if (devUser) {
    console.log('Found dev user:', devUser);
  } else {
    console.log('No user with username "dev" exists in the database.');
    console.log('\nTo create a dev user, you can:');
    console.log('1. Sign up with a new account using username "dev"');
    console.log('2. Or use one of the existing usernames listed above');
  }
}

checkUsers();