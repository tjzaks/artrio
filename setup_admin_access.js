const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM4Nzc2NywiZXhwIjoyMDcwOTYzNzY3fQ.zRvZhP5riZffZt-G9H5hHRuJmfZJYBr7cy_TCNFMz-Q'
);

async function setupAdminAccess() {
  console.log('🔐 Setting up admin access...\n');
  
  // Find Toby's account with correct email
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Find Toby
  const toby = users.find(u => 
    u.email === 'tobyszakacs@icloud.com' || 
    u.email === 'tobyszaks@gmail.com'
  );
  
  if (toby) {
    console.log(`✅ Found Toby's account: ${toby.email}`);
    console.log(`   User ID: ${toby.id}`);
    
    // Reset Toby's password
    const { error: pwError } = await supabase.auth.admin.updateUserById(toby.id, {
      password: 'ArtrioAdmin2025!'
    });
    
    if (!pwError) {
      console.log('✅ Toby\'s password reset to: ArtrioAdmin2025!');
    }
    
    // Make sure Toby has admin role in profiles
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('username', 'tobyszaks');
      
    if (!roleError) {
      console.log('✅ Toby has admin role');
    }
  } else {
    console.log('❌ Toby account not found with tobyszakacs@icloud.com');
    console.log('   Creating Toby as admin...');
    
    // Create Toby's account
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'tobyszakacs@icloud.com',
      password: 'ArtrioAdmin2025!',
      email_confirm: true,
      user_metadata: {
        username: 'tobyszaks',
        role: 'admin'
      }
    });
    
    if (newUser) {
      console.log('✅ Created Toby\'s admin account');
      
      // Create profile
      await supabase.from('profiles').insert({
        id: newUser.user.id,
        username: 'tobyszaks',
        role: 'admin',
        bio: 'Artrio Admin'
      });
    }
  }
  
  // Also make Tyler admin
  const tyler = users.find(u => u.email === 'tylerszakacs@gmail.com');
  if (tyler) {
    await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', tyler.id);
    console.log('✅ Tyler also has admin role');
  }
  
  console.log('\n📝 Admin Login Credentials:');
  console.log('------------------------');
  console.log('Toby:');
  console.log('  Email: tobyszakacs@icloud.com');
  console.log('  Password: ArtrioAdmin2025!');
  console.log('');
  console.log('Tyler (you):');
  console.log('  Email: tylerszakacs@gmail.com');  
  console.log('  Password: [your regular password]');
  console.log('------------------------');
  
  // List all users to verify
  console.log('\n👥 All Users in System:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, role')
    .order('username');
    
  profiles?.forEach(p => {
    console.log(`- ${p.username}${p.role === 'admin' ? ' (ADMIN)' : ''}`);
  });
}

setupAdminAccess().catch(console.error);