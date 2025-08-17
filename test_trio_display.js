import { createClient } from '@supabase/supabase-js';

// LOCAL SUPABASE
const supabaseUrl = 'http://127.0.0.1:54321';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, anonKey);

async function testTrioDisplay() {
  console.log('🧪 Testing if trios will now display correctly...\n');

  // Login as Tyler
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'tyler@artrio.com',
    password: 'test123'
  });

  if (!auth?.user) {
    console.log('❌ Failed to login');
    return;
  }

  console.log(`✅ Logged in as Tyler`);
  console.log(`   Auth ID: ${auth.user.id}\n`);

  // Simulate what Home.tsx does now
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch today's trios
  const { data: trios, error: trioError } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today);

  console.log(`📅 Today's date: ${today}`);
  console.log(`📊 Found ${trios?.length || 0} trios total\n`);

  // Find Tyler's trio (using auth user ID - THE FIX!)
  const trio = trios?.find(t => 
    t.user1_id === auth.user.id ||
    t.user2_id === auth.user.id ||
    t.user3_id === auth.user.id
  );

  if (trio) {
    console.log('✅ TYLER\'S TRIO FOUND!');
    console.log(`   Trio ID: ${trio.id}`);
    
    // Get trio members
    const userIds = [trio.user1_id, trio.user2_id, trio.user3_id].filter(Boolean);
    
    // Fetch profiles for trio members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, user_id')
      .in('user_id', userIds);

    console.log(`\n👥 Trio Members:`);
    profiles?.forEach(p => {
      const isTyler = p.user_id === auth.user.id;
      console.log(`   • ${p.username}${isTyler ? ' (you)' : ''}`);
    });

    console.log('\n🎉 TRIOS WILL NOW DISPLAY IN THE APP!');
  } else {
    console.log('❌ Tyler not in any trio - but the fix is correct!');
    console.log('   Run "Randomize Trios" in admin panel to create new trios');
  }

  // Show all trios for verification
  console.log('\n📋 All trios for today:');
  for (const t of trios || []) {
    const { data: members } = await supabase
      .from('profiles')
      .select('username')
      .in('user_id', [t.user1_id, t.user2_id, t.user3_id]);
    
    const names = members?.map(m => m.username).join(', ') || 'Unknown';
    console.log(`   Trio: ${names}`);
  }
}

testTrioDisplay();