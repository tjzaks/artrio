import { createClient } from '@supabase/supabase-js';

// LOCAL SUPABASE
const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Users to create
const users = [
  { email: 'tyler@artrio.com', username: 'tyler', password: 'test123', isAdmin: true },
  { email: 'jonnyb@artrio.com', username: 'jonnyb', password: 'test123' },
  { email: 'tobyszaks@artrio.com', username: 'tobyszaks', password: 'test123' },
  { email: 'joshyb@artrio.com', username: 'joshyb', password: 'test123' },
  { email: 'emma@artrio.com', username: 'emma', password: 'test123' },
  { email: 'jake@artrio.com', username: 'jake', password: 'test123' },
];

async function setupLocal() {
  console.log('🚀 SETTING UP LOCAL ARTRIO\n');
  console.log('=====================================\n');

  // Create users
  console.log('👥 Creating users...\n');
  const createdProfiles = [];
  
  for (const user of users) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { username: user.username }
      });

      if (authError) throw authError;

      console.log(`✅ Created: ${user.username} (${user.email})`);

      // Update profile
      const { data: profile } = await supabase
        .from('profiles')
        .update({
          username: user.username,
          display_name: user.username,
          is_admin: user.isAdmin || false,
          bio: user.isAdmin ? 'Artrio Admin' : `Hi, I'm ${user.username}!`
        })
        .eq('user_id', authData.user.id)
        .select()
        .single();

      if (profile) createdProfiles.push(profile);
    } catch (error) {
      console.error(`❌ Failed to create ${user.username}:`, error.message);
    }
  }

  // Create trios
  console.log('\n🎲 Creating trios for today...\n');
  
  if (createdProfiles.length >= 3) {
    const trios = [];
    for (let i = 0; i < createdProfiles.length - 2; i += 3) {
      trios.push({
        user1_id: createdProfiles[i].id,
        user2_id: createdProfiles[i + 1].id,
        user3_id: createdProfiles[i + 2].id,
        date: new Date().toISOString().split('T')[0]
      });
    }

    const { data: triosData, error: triosError } = await supabase
      .from('trios')
      .insert(trios)
      .select();

    if (triosError) {
      console.error('❌ Error creating trios:', triosError);
    } else {
      console.log(`✅ Created ${triosData.length} trios!`);
      for (let i = 0; i < triosData.length; i++) {
        const trio = triosData[i];
        const user1 = createdProfiles.find(p => p.id === trio.user1_id);
        const user2 = createdProfiles.find(p => p.id === trio.user2_id);
        const user3 = createdProfiles.find(p => p.id === trio.user3_id);
        console.log(`  Trio ${i + 1}: ${user1?.username}, ${user2?.username}, ${user3?.username}`);
      }
    }
  }

  console.log('\n=====================================');
  console.log('🎉 LOCAL SETUP COMPLETE!\n');
  console.log('Login credentials:');
  console.log('  tyler / test123 (Admin)');
  console.log('  jonnyb / test123');
  console.log('  All others: [username] / test123');
  console.log('\nAccess at: http://localhost:8080');
  console.log('=====================================\n');
}

setupLocal().catch(console.error);