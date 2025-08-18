const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestBots() {
  console.log('🤖 Creating 8 test bot users...\n');
  
  const testBots = [
    { 
      email: 'bot1@artrio.local', 
      username: 'ArtBot1', 
      bio: '🎨 I love painting and digital art!',
      password: 'password123'
    },
    { 
      email: 'bot2@artrio.local', 
      username: 'MusicBot2', 
      bio: '🎵 Music is my passion - jazz, rock, classical!',
      password: 'password123'
    },
    { 
      email: 'bot3@artrio.local', 
      username: 'TechBot3', 
      bio: '💻 Code, AI, and innovation enthusiast',
      password: 'password123'
    },
    { 
      email: 'bot4@artrio.local', 
      username: 'FoodieBot4', 
      bio: '🍔 Exploring cuisines from around the world',
      password: 'password123'
    },
    { 
      email: 'bot5@artrio.local', 
      username: 'TravelBot5', 
      bio: '✈️ Adventure seeker and world explorer',
      password: 'password123'
    },
    { 
      email: 'bot6@artrio.local', 
      username: 'BookBot6', 
      bio: '📚 Bookworm - fantasy, sci-fi, mysteries',
      password: 'password123'
    },
    { 
      email: 'bot7@artrio.local', 
      username: 'FitnessBot7', 
      bio: '💪 Gym rat and wellness advocate',
      password: 'password123'
    },
    { 
      email: 'bot8@artrio.local', 
      username: 'GameBot8', 
      bio: '🎮 Gamer - RPGs, strategy, and indie games',
      password: 'password123'
    }
  ];

  let successCount = 0;
  let skipCount = 0;

  for (const bot of testBots) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(u => u.email === bot.email);
      
      if (userExists) {
        console.log(`⚠️  ${bot.email} already exists - skipping`);
        skipCount++;
        continue;
      }

      // Create auth user
      const { data: authUser, error: signupError } = await supabase.auth.admin.createUser({
        email: bot.email,
        password: bot.password,
        email_confirm: true,
        user_metadata: {
          username: bot.username
        }
      });

      if (signupError) {
        console.error(`❌ Error creating ${bot.email}:`, signupError.message);
        continue;
      }

      // Create profile
      if (authUser.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            username: bot.username,
            bio: bot.bio,
            is_admin: false,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.username}`
          });

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error(`❌ Profile error for ${bot.email}:`, profileError.message);
        } else {
          console.log(`✅ Created ${bot.username} (${bot.email})`);
          successCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error with ${bot.email}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results:`);
  console.log(`   ✅ Successfully created: ${successCount} bots`);
  console.log(`   ⚠️  Already existed: ${skipCount} bots`);
  console.log('='.repeat(50) + '\n');
  
  // List all current users
  console.log('📋 All test accounts in local database:\n');
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('username, bio, is_admin')
    .order('username');
    
  if (allProfiles) {
    allProfiles.forEach(profile => {
      const adminBadge = profile.is_admin ? ' 🛡️ [ADMIN]' : '';
      console.log(`   @${profile.username}${adminBadge}`);
      console.log(`      ${profile.bio || 'No bio'}`);
    });
  }
  
  console.log('\n🎉 Bot users ready for trio randomization testing!');
  console.log('💡 Use the admin panel to test the "Randomize Trios" button');
}

createTestBots().catch(console.error);