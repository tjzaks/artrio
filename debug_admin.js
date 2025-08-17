import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NTA3MTMsImV4cCI6MjA3MTAyNjcxM30.Wt-9b6ohRw4hpTwT_ewov5sVWmYTFPOFtvxEOZWD8wM';

// Use anon key to simulate what the frontend sees
const supabase = createClient(supabaseUrl, anonKey);

async function debugAdmin() {
  console.log('Debugging admin access as frontend would see it...\n');

  // Get Tyler's auth user ID
  const tylerUserId = '7210f270-c99b-4cc6-96c7-39ee88e9f219';
  
  console.log('Checking what frontend sees for user_id:', tylerUserId);
  
  // Try the exact query the AuthContext uses
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', tylerUserId)
    .single();
  
  console.log('Query result:', { profile, error });
  
  if (profile) {
    console.log('\n✅ Frontend should see: is_admin =', profile.is_admin);
  }
  
  // Also check by username
  console.log('\nAlso checking by username...');
  const { data: profileByUsername } = await supabase
    .from('profiles')
    .select('username, is_admin, user_id')
    .eq('username', 'tyler')
    .single();
  
  console.log('Tyler profile:', profileByUsername);
  
  // Check if is_user_admin function exists
  console.log('\nChecking if is_user_admin function exists...');
  try {
    const { data, error: rpcError } = await supabase
      .rpc('is_user_admin', { auth_user_id: tylerUserId });
    
    if (rpcError) {
      console.log('❌ is_user_admin function not found (expected if SQL not run)');
    } else {
      console.log('✅ is_user_admin returns:', data);
    }
  } catch (e) {
    console.log('Function not available');
  }
  
  console.log('\n📝 SOLUTION:');
  console.log('1. Log out completely');
  console.log('2. Clear browser cache/cookies for artrio.up.railway.app');
  console.log('3. Log back in with username: tyler');
  console.log('4. The admin button (shield icon) should appear in top right');
}

debugAdmin();