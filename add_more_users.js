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

async function addMoreUsers() {
  console.log('🔧 Adding more users for trio creation...\n');

  // List of additional users to create
  const newUsers = [
    { email: 'alex@artrio.com', username: 'alex', password: 'test123', displayName: 'Alex' },
    { email: 'sam@artrio.com', username: 'sam', password: 'test123', displayName: 'Sam' },
    { email: 'jordan@artrio.com', username: 'jordan', password: 'test123', displayName: 'Jordan' },
    { email: 'casey@artrio.com', username: 'casey', password: 'test123', displayName: 'Casey' },
    { email: 'morgan@artrio.com', username: 'morgan', password: 'test123', displayName: 'Morgan' },
    { email: 'riley@artrio.com', username: 'riley', password: 'test123', displayName: 'Riley' },
    { email: 'taylor@artrio.com', username: 'taylor', password: 'test123', displayName: 'Taylor' },
    { email: 'drew@artrio.com', username: 'drew', password: 'test123', displayName: 'Drew' },
    { email: 'blake@artrio.com', username: 'blake', password: 'test123', displayName: 'Blake' }
  ];

  let created = 0;
  let skipped = 0;

  for (const user of newUsers) {
    try {
      // Check if user already exists
      const { data: existing } = await supabase.auth.admin.listUsers();
      const exists = existing?.users?.some(u => u.email === user.email);
      
      if (exists) {
        console.log(`⏭️  Skipping ${user.username} (already exists)`);
        skipped++;
        continue;
      }

      // Create the user
      console.log(`Creating user: ${user.username}...`);
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { username: user.username }
      });

      if (error) {
        console.log(`❌ Error creating ${user.username}:`, error.message);
        continue;
      }

      if (newUser) {
        // Update profile with username and display name
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            username: user.username,
            display_name: user.displayName,
            bio: `${user.displayName} from Artrio`
          })
          .eq('user_id', newUser.user.id);

        if (profileError) {
          console.log(`⚠️  Profile update failed for ${user.username}:`, profileError.message);
        } else {
          console.log(`✅ Created ${user.username}`);
          created++;
        }
      }
    } catch (err) {
      console.log(`❌ Error with ${user.username}:`, err.message);
    }
  }

  // Check total user count
  console.log('\n📊 Checking total users...');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username')
    .order('username');

  console.log(`\nTotal users in system: ${profiles?.length || 0}`);
  if (profiles && profiles.length > 0) {
    console.log('Users:');
    profiles.forEach(p => console.log(`  • ${p.username}`));
  }

  console.log('\n📝 Summary:');
  console.log(`  Created: ${created} users`);
  console.log(`  Skipped: ${skipped} users`);
  console.log(`  Total: ${profiles?.length || 0} users`);

  if (profiles && profiles.length >= 3) {
    console.log('\n✅ Enough users for trio creation!');
    console.log('The "Randomize Trios" button will now work.');
  } else {
    console.log('\n⚠️ Still need more users for trios.');
  }
}

addMoreUsers();