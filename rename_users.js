const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM4Nzc2NywiZXhwIjoyMDcwOTYzNzY3fQ.zRvZhP5riZffZt-G9H5hHRuJmfZJYBr7cy_TCNFMz-Q'
);

async function renameUsers() {
  console.log('🔄 Renaming users...\n');
  
  // 1. Change Ava Mitchell to Beth Mitchell
  console.log('Changing Ava Mitchell to Beth Mitchell...');
  
  // Find Ava's auth user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const avaUser = users.find(u => u.email === 'ava.mitchell.artrio@test.com');
  
  if (avaUser) {
    // Update auth metadata
    await supabase.auth.admin.updateUserById(avaUser.id, {
      email: 'beth.mitchell.artrio@test.com',
      user_metadata: {
        username: 'beth_mitchell_11',
        first_name: 'Beth',
        last_name: 'Mitchell',
        age: 16,
        grade: 11
      }
    });
    
    // Update profile
    await supabase
      .from('profiles')
      .update({
        username: 'beth_mitchell_11',
        bio: 'Track star and cross country runner. Training for state championships. Early morning runs are my meditation.'
      })
      .eq('id', avaUser.id);
      
    console.log('✅ Changed Ava to Beth Mitchell (beth_mitchell_11)');
  }
  
  // 2. Change Tyler Brooks to Logan Brooks
  console.log('\nChanging Tyler Brooks to Logan Brooks...');
  
  const tylerUser = users.find(u => u.email === 'tyler.brooks.artrio@test.com');
  
  if (tylerUser) {
    // Update auth metadata
    await supabase.auth.admin.updateUserById(tylerUser.id, {
      email: 'logan.brooks.artrio@test.com',
      user_metadata: {
        username: 'logan_brooks_12',
        first_name: 'Logan',
        last_name: 'Brooks',
        age: 18,
        grade: 12
      }
    });
    
    // Update profile
    await supabase
      .from('profiles')
      .update({
        username: 'logan_brooks_12',
        bio: 'Student body president and Model UN delegate. Working to make our school better for everyone. Future diplomat in training!'
      })
      .eq('id', tylerUser.id);
      
    console.log('✅ Changed Tyler to Logan Brooks (logan_brooks_12)');
  }
  
  // 3. Verify changes
  console.log('\n📋 Updated user list:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username')
    .like('username', '%_1%')
    .order('username');
    
  const testUsers = profiles.filter(p => 
    p.username && (p.username.includes('_10') || p.username.includes('_11') || p.username.includes('_12'))
  );
  
  console.log('\nDummy students:');
  testUsers.forEach(u => console.log(`- ${u.username}`));
  
  console.log('\n✅ Renaming complete!');
  console.log('\nNew login credentials:');
  console.log('- Email: beth.mitchell.artrio@test.com (was ava)');
  console.log('- Email: logan.brooks.artrio@test.com (was tyler)');
  console.log('- Password: ArtrioTest2025! (unchanged)');
}

renameUsers().catch(console.error);