import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Users to import (Tyler, Jonny B, and test users)
const users = [
  { email: 'szakacsmediacompany@gmail.com', username: 'tyler', password: 'Claude&Cursor4Life!', isAdmin: true },
  { email: 'jonnyb@example.com', username: 'Jonny B', password: 'test123456' },
  { email: 'jake@example.com', username: 'jake_thompson_12', password: 'test123456' },
  { email: 'emma@example.com', username: 'emma_johnson_12', password: 'test123456' },
  { email: 'ethan@example.com', username: 'ethan_davis_12', password: 'test123456' },
  { email: 'sophia@example.com', username: 'sophia_miller_12', password: 'test123456' },
  { email: 'mason@example.com', username: 'mason_wilson_12', password: 'test123456' },
  { email: 'olivia@example.com', username: 'olivia_moore_12', password: 'test123456' },
  { email: 'logan@example.com', username: 'logan_taylor_12', password: 'test123456' },
  { email: 'isabella@example.com', username: 'isabella_anderson_12', password: 'test123456' },
  { email: 'dylan@example.com', username: 'dylan_thomas_12', password: 'test123456' },
  { email: 'beth@example.com', username: 'beth_jackson_12', password: 'test123456' }
];

async function importUsers() {
  console.log('👥 Importing users to fresh database...\n');

  const createdProfiles = [];

  for (const user of users) {
    console.log(`Creating user: ${user.username}...`);
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { username: user.username }
    });

    if (authError) {
      console.error(`❌ Error creating ${user.username}:`, authError.message);
      continue;
    }

    console.log(`✅ Created auth user: ${user.username}`);

    // Create or update profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: authData.user.id,
        username: user.username,
        display_name: user.username,
        is_admin: user.isAdmin || false,
        bio: user.isAdmin ? 'Artrio Admin' : `I'm ${user.username}, excited to connect!`
      })
      .select()
      .single();

    if (profileError) {
      console.error(`❌ Error creating profile for ${user.username}:`, profileError.message);
    } else {
      console.log(`✅ Created profile: ${user.username}${user.isAdmin ? ' (ADMIN)' : ''}`);
      createdProfiles.push(profile);
    }
  }

  console.log(`\n✅ Imported ${createdProfiles.length} users successfully!\n`);

  // Create today's trios
  console.log('🎲 Creating trios for today...');
  
  // Shuffle profiles
  const shuffled = [...createdProfiles].sort(() => Math.random() - 0.5);
  const trios = [];
  
  // Create groups of 3
  for (let i = 0; i < shuffled.length - 2; i += 3) {
    trios.push({
      user1_id: shuffled[i].id,
      user2_id: shuffled[i + 1].id,
      user3_id: shuffled[i + 2].id,
      date: new Date().toISOString().split('T')[0]
    });
  }

  // Insert trios
  const { data: triosData, error: triosError } = await supabase
    .from('trios')
    .insert(trios)
    .select();

  if (triosError) {
    console.error('❌ Error creating trios:', triosError);
  } else {
    console.log(`✅ Created ${triosData.length} trios for today!`);
    
    // Show who's in each trio
    for (let i = 0; i < triosData.length; i++) {
      const trio = triosData[i];
      const user1 = createdProfiles.find(p => p.id === trio.user1_id);
      const user2 = createdProfiles.find(p => p.id === trio.user2_id);
      const user3 = createdProfiles.find(p => p.id === trio.user3_id);
      console.log(`  Trio ${i + 1}: ${user1?.username}, ${user2?.username}, ${user3?.username}`);
    }
  }

  console.log('\n🎉 Import complete!');
  console.log('\n📝 Login credentials:');
  console.log('  Tyler (Admin): szakacsmediacompany@gmail.com / Claude&Cursor4Life!');
  console.log('  Jonny B: jonnyb@example.com / test123456');
  console.log('  Others: [username]@example.com / test123456');
}

importUsers().catch(console.error);