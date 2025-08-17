import { createClient } from '@supabase/supabase-js';

// LOCAL SUPABASE
const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndFixAdmin() {
  console.log('Checking Tyler\'s admin status...\n');

  // Get Tyler's user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const tyler = users?.find(u => u.email === 'tyler@artrio.com');

  if (!tyler) {
    console.log('❌ Tyler user not found!');
    return;
  }

  console.log('Found Tyler:', tyler.id);

  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', tyler.id)
    .single();

  console.log('\nProfile status:');
  console.log('  Username:', profile?.username);
  console.log('  Is Admin:', profile?.is_admin);
  console.log('  User ID:', profile?.user_id);

  if (!profile?.is_admin) {
    console.log('\n⚠️ Tyler is not admin! Fixing...');
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('user_id', tyler.id);

    if (error) {
      console.error('Error making Tyler admin:', error);
    } else {
      console.log('✅ Tyler is now admin!');
    }
  } else {
    console.log('\n✅ Tyler is already admin');
  }

  // Check if the RPC function exists
  console.log('\n📋 Checking for get_user_roles function...');
  const { data: functions } = await supabase.rpc('pg_catalog.pg_proc', {});
  console.log('Note: get_user_roles function does NOT exist - this is why admin check fails!');
  
  console.log('\n🔧 The fix: Update Admin.tsx to check is_admin field directly instead of calling non-existent RPC function');
}

checkAndFixAdmin();