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

async function makeTobyAdmin() {
  console.log('🔍 Finding tobyszaks account...');
  
  // Update tobyszaks to admin
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('username', 'tobyszaks')
    .select();

  if (error) {
    console.error('❌ Error updating profile:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Successfully made tobyszaks an admin!');
    console.log('Profile:', data[0]);
  } else {
    console.log('⚠️  No profile found with username tobyszaks');
  }
}

makeTobyAdmin();