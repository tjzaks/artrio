const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUsers = [
  { email: 'alice@artrio.local', username: 'alice', bio: 'Loves art and creativity!' },
  { email: 'bob@artrio.local', username: 'bob', bio: 'Music is my passion' },
  { email: 'charlie@artrio.local', username: 'charlie', bio: 'Coding and coffee' },
  { email: 'dev@artrio.local', username: 'dev', bio: 'Admin account for development' }
];

const testBots = [
  { email: 'bot1@artrio.local', username: 'ArtBot1', bio: '🎨 I love painting and digital art!' },
  { email: 'bot2@artrio.local', username: 'MusicBot2', bio: '🎵 Always listening to something new' },
  { email: 'bot3@artrio.local', username: 'SportBot3', bio: '⚽ Sports enthusiast and team player' },
  { email: 'bot4@artrio.local', username: 'BookBot4', bio: '📚 Reading is my escape' },
  { email: 'bot5@artrio.local', username: 'TechBot5', bio: '💻 Tech geek and problem solver' },
  { email: 'bot6@artrio.local', username: 'NatureBot6', bio: '🌱 Nature lover and environmentalist' },
  { email: 'bot7@artrio.local', username: 'GameBot7', bio: '🎮 Gaming is life!' },
  { email: 'bot8@artrio.local', username: 'FoodBot8', bio: '🍕 Foodie and amateur chef' }
];

async function setupUsers() {
  console.log('Setting up local test users...\n');

  // Create all test users (regular + bots)
  const allUsers = [...testUsers, ...testBots];
  
  for (const userData of allUsers) {
    try {
      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: 'password123',
        email_confirm: true
      });

      if (authError) {
        console.error(`Error creating ${userData.email}:`, authError.message);
        continue;
      }

      console.log(`✅ Created user: ${userData.email}`);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: userData.username,
          bio: userData.bio
        })
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.error(`Error updating profile for ${userData.email}:`, profileError.message);
      } else {
        console.log(`   Updated profile: ${userData.username}`);
      }
    } catch (error) {
      console.error(`Error with ${userData.email}:`, error.message);
    }
  }

  // Make dev@artrio.local an admin
  console.log('\nGranting admin privileges...');
  
  const { data: devUser } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', 'dev')
    .single();

  if (devUser) {
    const { error: adminError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('user_id', devUser.user_id);

    if (adminError) {
      console.error('Error making dev admin:', adminError.message);
    } else {
      console.log('✅ dev@artrio.local is now an admin');
    }
  }

  console.log('\n✨ Setup complete! You now have:');
  console.log('   - 4 regular test users');
  console.log('   - 8 bot users for testing');
  console.log('   - dev@artrio.local with admin privileges');
  console.log('\nYou can log in with any user using password: password123');
}

setupUsers().catch(console.error);