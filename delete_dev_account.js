import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteDevAccount() {
  console.log('Deleting dev account...\n');

  // First get the dev profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', 'dev')
    .single();

  if (!profile) {
    console.log('Dev profile not found');
    return;
  }

  console.log('Found dev profile with user_id:', profile.user_id);

  // Delete from profiles first (due to foreign key constraints)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('username', 'dev');

  if (profileError) {
    console.error('Error deleting profile:', profileError);
    return;
  }

  // Delete from auth.users
  const { error: authError } = await supabase.auth.admin.deleteUser(
    profile.user_id
  );

  if (authError) {
    console.error('Error deleting auth user:', authError);
    return;
  }

  console.log('✅ Dev account deleted successfully!');
  
  // Show remaining users
  console.log('\n📋 Remaining users:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .order('username');
  
  profiles?.forEach(p => {
    console.log(`   ${p.username}${p.is_admin ? ' (Admin)' : ''}`);
  });
}

deleteDevAccount();