import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDevEmail() {
  console.log('Looking up dev user email...\n');
  
  // Use service role to list all users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  // Find dev user
  const { data: devProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', 'dev')
    .single();

  if (!devProfile) {
    console.log('Dev profile not found');
    return;
  }

  const devUser = users.find(u => u.id === devProfile.user_id);
  
  if (devUser) {
    console.log('✅ DEV USER LOGIN INFO:');
    console.log('------------------------');
    console.log('Username: dev');
    console.log('Email:', devUser.email);
    console.log('Password: (whatever you set when signing up)');
    console.log('\nYou can login with either:');
    console.log(`1. Username: "dev" + your password`);
    console.log(`2. Email: "${devUser.email}" + your password`);
  } else {
    console.log('Dev user not found in auth.users');
  }
}

checkDevEmail();