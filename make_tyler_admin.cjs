const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeTylerAdmin() {
  console.log('🔍 Finding user with email tyler@szakacsmedia.com...');
  
  // First, find the user by email in auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }

  const targetUser = authUser.users.find(user => user.email === 'tyler@szakacsmedia.com');
  
  if (!targetUser) {
    console.log('⚠️  No user found with email tyler@szakacsmedia.com');
    console.log('Available users:');
    authUser.users.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });
    return;
  }

  console.log(`✅ Found user: ${targetUser.email} (ID: ${targetUser.id})`);

  // Now find their profile and make them admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', targetUser.id)
    .single();

  if (profileError) {
    console.error('❌ Error finding profile:', profileError);
    return;
  }

  console.log(`📋 Found profile: @${profile.username}`);

  // Update to admin
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('user_id', targetUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating profile to admin:', updateError);
    return;
  }

  console.log('✅ Successfully made tyler@szakacsmedia.com an admin!');
  console.log('Updated profile:', {
    username: updatedProfile.username,
    email: targetUser.email,
    is_admin: updatedProfile.is_admin,
    user_id: updatedProfile.user_id
  });
}

makeTylerAdmin().catch(console.error);