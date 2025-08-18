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

async function updateBotBios() {
  console.log('🔧 Updating bot user bios...\n');
  
  const botProfiles = [
    { username: 'artbot1', bio: '🎨 I love painting and digital art!' },
    { username: 'musicbot2', bio: '🎵 Music is my passion - jazz, rock, classical!' },
    { username: 'techbot3', bio: '💻 Code, AI, and innovation enthusiast' },
    { username: 'foodiebot4', bio: '🍔 Exploring cuisines from around the world' },
    { username: 'travelbot5', bio: '✈️ Adventure seeker and world explorer' },
    { username: 'bookbot6', bio: '📚 Bookworm - fantasy, sci-fi, mysteries' },
    { username: 'fitnessbot7', bio: '💪 Gym rat and wellness advocate' },
    { username: 'gamebot8', bio: '🎮 Gamer - RPGs, strategy, and indie games' }
  ];

  for (const bot of botProfiles) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        bio: bot.bio,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.username}`
      })
      .eq('username', bot.username)
      .select();

    if (error) {
      console.error(`❌ Error updating ${bot.username}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`✅ Updated @${bot.username}: ${bot.bio}`);
    }
  }

  // Also update other test users with fun bios
  const otherUsers = [
    { username: 'alice', bio: '👩‍💻 Software developer and coffee addict' },
    { username: 'bob', bio: '🏗️ Builder of things, breaker of bugs' },
    { username: 'dev', bio: '🛠️ Local development test account with admin powers' },
    { username: 'tyler', bio: '👨‍💼 Admin account for testing' }
  ];

  console.log('\n📝 Updating other test user bios...\n');
  
  for (const user of otherUsers) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ bio: user.bio })
      .eq('username', user.username)
      .select();

    if (error) {
      console.error(`❌ Error updating ${user.username}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`✅ Updated @${user.username}: ${user.bio}`);
    }
  }

  console.log('\n🎉 All bios updated successfully!');
}

updateBotBios().catch(console.error);