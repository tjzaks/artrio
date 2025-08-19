import { createClient } from '@supabase/supabase-js';

// Production Supabase configuration
const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

// Create client with service role for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfiles() {
  console.log('Testing profiles table...\n');
  
  // 1. Count total profiles
  const { count: totalCount, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total profiles count:', totalCount);
  if (countError) {
    console.error('Count error:', countError);
  }
  
  // 2. Fetch all profiles with details - use only existing columns
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, username, avatar_url, created_at, is_admin')
    .order('created_at', { ascending: false });
  
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log('\nFetched profiles:', profiles?.length || 0);
    
    if (profiles && profiles.length > 0) {
      console.log('\nProfile details:');
      profiles.forEach((profile, index) => {
        console.log(`\n${index + 1}. Username: @${profile.username}`);
        console.log(`   User ID: ${profile.user_id}`);
        console.log(`   Created: ${profile.created_at}`);
        console.log(`   Is Admin: ${profile.is_admin}`);
        console.log(`   Is Banned: ${profile.is_banned}`);
        console.log(`   Avatar: ${profile.avatar_url ? 'Yes' : 'No'}`);
      });
    }
  }
  
  // 3. Check for any null fields that might cause issues
  const { data: nullCheck, error: nullError } = await supabase
    .from('profiles')
    .select('*')
    .or('user_id.is.null,username.is.null');
  
  if (nullCheck && nullCheck.length > 0) {
    console.log('\n⚠️ Profiles with NULL fields found:', nullCheck.length);
    console.log('These profiles might cause display issues.');
  }
  
  process.exit(0);
}

testProfiles().catch(console.error);