import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

// Direct database connection (from Supabase dashboard -> Settings -> Database)
async function setupUsernameLogin() {
  // Try using the Supabase API first
  const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';
  
  const supabase = createClient(supabaseUrl, serviceKey);
  
  console.log('Setting up username login...\n');
  
  // Unfortunately we can't run raw SQL via the JS client
  // The only way is through the dashboard
  
  console.log('❌ Cannot run SQL directly from JavaScript client');
  console.log('\n📋 Please follow these steps:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/siqmwgeriobtlnkxfeas/sql/new');
  console.log('2. Copy the contents of COMPLETE_AUTH_SETUP.sql');
  console.log('3. Paste and click "Run"');
  console.log('\n🔑 For now, you can login with:');
  console.log('   Email: tyler@szakacsmedia.com');
  console.log('   Password: [your password for dev user]');
  
  // Show all users and their emails for reference
  console.log('\n📧 All user emails for login:');
  const { data: { users } } = await supabase.auth.admin.listUsers();
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, user_id')
    .order('username');
  
  profiles?.forEach(profile => {
    const user = users?.find(u => u.id === profile.user_id);
    if (user) {
      console.log(`   ${profile.username}: ${user.email}`);
    }
  });
}

setupUsernameLogin();