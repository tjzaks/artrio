import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey);

async function fixTylerAdmin() {
  console.log('Checking Tyler admin status...\n');

  // Get Tyler's profile
  const { data: tyler, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', 'tyler')
    .single();

  if (fetchError || !tyler) {
    console.error('Error finding Tyler:', fetchError);
    return;
  }

  console.log('Current Tyler profile:', {
    username: tyler.username,
    is_admin: tyler.is_admin,
    user_id: tyler.user_id
  });

  if (tyler.is_admin) {
    console.log('\n✅ Tyler is already an admin!');
    console.log('\nIf admin panel not showing, the issue might be:');
    console.log('1. Cache issue - try logging out and back in');
    console.log('2. AuthContext not checking is_admin properly');
    return;
  }

  // Make Tyler admin
  console.log('\n🔧 Setting Tyler as admin...');
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('username', 'tyler')
    .select()
    .single();

  if (updateError) {
    console.error('Error updating:', updateError);
    return;
  }

  console.log('✅ Tyler is now admin!', updated);
  
  // Check all admins
  console.log('\n👑 All admins in system:');
  const { data: admins } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('is_admin', true);
  
  admins?.forEach(admin => {
    console.log(`  - ${admin.username}`);
  });
  
  console.log('\n📝 Next steps:');
  console.log('1. Log out of Artrio');
  console.log('2. Log back in with username: tyler');
  console.log('3. Admin panel should appear in navigation');
}

fixTylerAdmin();