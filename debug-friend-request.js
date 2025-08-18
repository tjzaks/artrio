import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://192.168.68.172:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFriendRequest() {
  console.log('=== Debugging Friend Request Issue ===\n');
  
  // 1. Check if friendships table exists
  console.log('1. Checking friendships table...');
  const { data: tableCheck, error: tableError } = await supabase
    .from('friendships')
    .select('*')
    .limit(1);
  
  if (tableError) {
    console.error('❌ Friendships table error:', tableError.message);
    console.error('   Details:', tableError);
  } else {
    console.log('✅ Friendships table exists');
  }
  
  // 2. Get test user profiles
  console.log('\n2. Getting test user profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, username')
    .in('username', ['toby', 'test'])
    .limit(2);
  
  if (profileError) {
    console.error('❌ Error getting profiles:', profileError);
    return;
  }
  
  if (!profiles || profiles.length < 2) {
    console.error('❌ Need at least 2 profiles to test. Found:', profiles);
    return;
  }
  
  console.log('✅ Found profiles:');
  profiles.forEach(p => console.log(`   - ${p.username}: profile_id=${p.id}, user_id=${p.user_id}`));
  
  // 3. Try to insert a friendship
  console.log('\n3. Testing friendship insert...');
  const [user1, user2] = profiles;
  
  // First check if friendship exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${user1.id},friend_id.eq.${user2.id}),and(user_id.eq.${user2.id},friend_id.eq.${user1.id})`);
  
  if (existing && existing.length > 0) {
    console.log('⚠️  Friendship already exists:', existing);
    // Try to delete it for testing
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', existing[0].id);
    
    if (deleteError) {
      console.error('❌ Could not delete existing friendship:', deleteError);
    } else {
      console.log('✅ Deleted existing friendship for testing');
    }
  }
  
  // Now try to insert
  const { data: insertData, error: insertError } = await supabase
    .from('friendships')
    .insert({
      user_id: user1.id,
      friend_id: user2.id,
      status: 'pending'
    })
    .select();
  
  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    console.error('   Full error:', insertError);
    
    // Check if it's a foreign key issue
    if (insertError.message.includes('foreign key')) {
      console.log('\n⚠️  This is a foreign key constraint issue.');
      console.log('   The friendships table expects profile IDs, not user IDs.');
    }
  } else {
    console.log('✅ Successfully inserted friendship:', insertData);
  }
  
  // 4. Check table constraints
  console.log('\n4. Checking table structure...');
  const { data: columns } = await supabase.rpc('get_table_info', { 
    table_name: 'friendships' 
  }).catch(err => {
    console.log('   RPC not available, skipping table info check');
    return { data: null };
  });
  
  if (columns) {
    console.log('   Table columns:', columns);
  }
}

debugFriendRequest().catch(console.error);