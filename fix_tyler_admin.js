import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqwijkvpzyadpsegvgbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM4Nzc2NywiZXhwIjoyMDcwOTYzNzY3fQ.n7RPManQj5FjswKBs0D3gMHlyCmQR4gIHDLB7gAVK-g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTylerAdmin() {
  console.log('Checking Tyler\'s current admin status...');
  
  // First check current status
  const { data: currentStatus, error: checkError } = await supabase
    .from('profiles')
    .select('username, is_admin, user_id')
    .eq('username', 'tyler')
    .single();
    
  if (checkError) {
    console.error('Error checking status:', checkError);
    return;
  }
  
  console.log('Current status:', currentStatus);
  
  if (currentStatus.is_admin) {
    console.log('Tyler is already an admin!');
    
    // Check if the admin dashboard is enabled
    console.log('\nChecking admin functions...');
    const { data: adminCheck, error: adminError } = await supabase
      .rpc('is_user_admin', { auth_user_id: currentStatus.user_id });
      
    if (adminError) {
      console.log('is_user_admin function might not exist:', adminError.message);
    } else {
      console.log('is_user_admin returned:', adminCheck);
    }
    
    return;
  }
  
  // Make Tyler admin
  console.log('\nMaking Tyler an admin...');
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
  
  console.log('Successfully updated:', updated);
  
  // Verify all admins
  console.log('\nAll admins in system:');
  const { data: admins } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('is_admin', true);
    
  console.log(admins);
}

fixTylerAdmin();