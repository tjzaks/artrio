const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeDevAdmin() {
  console.log('🔍 Finding dev@artrio.local account...');
  
  // First, find the user by email in auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }

  const targetUser = authUser.users.find(user => user.email === 'dev@artrio.local');
  
  if (!targetUser) {
    console.log('⚠️  No user found with email dev@artrio.local');
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

  console.log(`📋 Found profile: @${profile.username} (current admin status: ${profile.is_admin})`);

  if (profile.is_admin) {
    console.log('✅ dev@artrio.local is already an admin!');
    return;
  }

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

  console.log('✅ Successfully made dev@artrio.local an admin!');
  console.log('Updated profile:', {
    username: updatedProfile.username,
    email: targetUser.email,
    is_admin: updatedProfile.is_admin,
    user_id: updatedProfile.user_id
  });
  
  console.log('');
  console.log('🎉 The dev account now has admin privileges!');
  console.log('You can access the admin panel at /admin when logged in as dev@artrio.local');
}

makeDevAdmin().catch(console.error);