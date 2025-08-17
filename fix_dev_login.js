import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey);

async function fixDevUser() {
  console.log('Checking dev user...\n');

  // Get dev profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', 'dev')
    .single();

  if (profileError || !profile) {
    console.log('Dev user not found in profiles');
    return;
  }

  console.log('Dev profile found:', {
    username: profile.username,
    user_id: profile.user_id
  });

  // Get auth user details
  const { data: authUser, error: authError } = await supabase.auth.admin.getUser(
    profile.user_id
  );

  if (authError) {
    console.error('Error getting auth user:', authError);
    return;
  }

  console.log('\nDev user auth details:');
  console.log('Email:', authUser.user?.email);
  console.log('Created:', authUser.user?.created_at);
  
  // The issue is that the get_email_from_username function doesn't exist
  // Let's provide a workaround
  console.log('\n=== LOGIN WORKAROUND ===');
  console.log('Since the SQL function isn\'t created yet, you can login with:');
  console.log(`Email: ${authUser.user?.email}`);
  console.log('Password: (whatever password you set when creating dev user)');
  
  console.log('\n=== OR CREATE THE FUNCTION ===');
  console.log('Run COMPLETE_AUTH_SETUP.sql in Supabase SQL Editor');
  console.log('Then you can login with username: "dev"');
}

fixDevUser();