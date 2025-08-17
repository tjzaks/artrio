const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM4Nzc2NywiZXhwIjoyMDcwOTYzNzY3fQ.zRvZhP5riZffZt-G9H5hHRuJmfZJYBr7cy_TCNFMz-Q'
);

async function fixProfiles() {
  console.log('🔧 Fixing dummy user profiles...\n');
  
  // Get all auth users with test emails
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  const testUsers = users.filter(u => u.email && u.email.includes('artrio@test.com'));
  console.log(`Found ${testUsers.length} test users in auth.users\n`);
  
  for (const user of testUsers) {
    const metadata = user.user_metadata || {};
    const username = metadata.username || user.email.split('@')[0].replace('.', '_');
    
    console.log(`Creating/updating profile for ${username}...`);
    
    // Create or update profile with correct structure
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,  // This should match auth.users.id
        user_id: user.id,  // Some schemas use user_id instead
        username: username,
        bio: metadata.bio || `Test user ${metadata.first_name || username}`,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (profileError) {
      console.log(`⚠️ Error for ${username}:`, profileError.message);
      
      // Try with just user_id if id doesn't work
      const { error: altError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          username: username,
          bio: `Test user ${username}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
        
      if (altError) {
        console.log(`❌ Still failed:`, altError.message);
      } else {
        console.log(`✅ Created profile with user_id`);
      }
    } else {
      console.log(`✅ Profile created/updated`);
    }
  }
  
  // Check final count
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('username');
    
  console.log(`\n📊 Total profiles now: ${allProfiles?.length || 0}`);
  if (allProfiles) {
    console.log('All usernames:', allProfiles.map(p => p.username).join(', '));
  }
  
  console.log('\n✨ Now you should have enough users for trio randomization!');
  console.log('Try clicking "Randomize Trios" again in the admin panel.');
}

fixProfiles().catch(console.error);