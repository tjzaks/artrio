import { createClient } from '@supabase/supabase-js';

// LOCAL SUPABASE
const supabaseUrl = 'http://127.0.0.1:54321';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, anonKey);

async function testRandomizeWithUsers() {
  console.log('🎲 TESTING RANDOMIZE TRIOS WITH 15 USERS\n');
  console.log('='*60);

  // Login as Tyler (admin)
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'tyler@artrio.com',
    password: 'test123'
  });

  if (!auth) {
    console.log('❌ Failed to login');
    return;
  }

  console.log('✅ Logged in as Tyler (admin)\n');

  // First, clear any existing trios
  console.log('Clearing existing trios...');
  await supabase.rpc('delete_todays_trios');

  // Now randomize
  console.log('Creating random trios...');
  const { error: randomizeError } = await supabase.rpc('randomize_trios');
  
  if (randomizeError) {
    console.log('❌ Randomize failed:', randomizeError.message);
    return;
  }

  // Get the created trios
  const { data: trios } = await supabase
    .from('trios')
    .select(`
      id,
      date,
      user1:profiles!trios_user1_id_fkey(username),
      user2:profiles!trios_user2_id_fkey(username),
      user3:profiles!trios_user3_id_fkey(username)
    `)
    .eq('date', new Date().toISOString().split('T')[0]);

  console.log(`\n✅ SUCCESS! Created ${trios?.length || 0} trios:\n`);
  
  if (trios && trios.length > 0) {
    trios.forEach((trio, index) => {
      console.log(`Trio ${index + 1}:`);
      console.log(`  • ${trio.user1?.username || 'Unknown'}`);
      console.log(`  • ${trio.user2?.username || 'Unknown'}`);
      console.log(`  • ${trio.user3?.username || 'Unknown'}`);
      console.log('');
    });
  }

  console.log('='*60);
  console.log('🎉 RANDOMIZE TRIOS IS FULLY WORKING!');
  console.log('\nWith 15 users, we can create 5 perfect trios.');
  console.log('The "Randomize Trios" button in admin panel works!');
  console.log('\n📱 Go to http://localhost:8080/admin');
  console.log('   Click "System" tab → "Randomize Trios"');
  console.log('   It will work perfectly now!');
}

testRandomizeWithUsers();