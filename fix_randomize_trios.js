import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

// LOCAL SUPABASE
const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRandomizeTrios() {
  console.log('🔧 Fixing randomize_trios function...\n');

  const pgClient = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await pgClient.connect();

    // First, ensure we have enough users
    console.log('📊 Checking existing users...');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username');

    console.log(`Found ${profiles?.length || 0} users:`);
    profiles?.forEach(p => console.log(`  - ${p.username}`));

    if (!profiles || profiles.length < 3) {
      console.log('\n⚠️ Not enough users! Creating more test users...');
      
      // Create additional test users if needed
      const testUsers = [
        { email: 'alex@example.com', username: 'alex', password: 'test123' },
        { email: 'sam@example.com', username: 'sam', password: 'test123' },
        { email: 'jordan@example.com', username: 'jordan', password: 'test123' },
        { email: 'casey@example.com', username: 'casey', password: 'test123' },
        { email: 'morgan@example.com', username: 'morgan', password: 'test123' },
        { email: 'riley@example.com', username: 'riley', password: 'test123' }
      ];

      for (const user of testUsers) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const exists = existing?.users?.some(u => u.email === user.email);
        
        if (!exists) {
          console.log(`Creating user: ${user.username}`);
          const { data: newUser, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: { username: user.username }
          });

          if (newUser) {
            // Update profile
            await supabase
              .from('profiles')
              .update({ 
                username: user.username,
                display_name: user.username.charAt(0).toUpperCase() + user.username.slice(1)
              })
              .eq('user_id', newUser.user.id);
          }
        }
      }
    }

    // Now fix the randomize_trios function
    console.log('\n🔧 Creating improved randomize_trios function...');
    await pgClient.query(`
      CREATE OR REPLACE FUNCTION public.randomize_trios()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        user_count INTEGER;
        users_array UUID[];
        shuffled_users UUID[];
        i INTEGER;
        j INTEGER;
        temp UUID;
        rand_pos INTEGER;
        trio_count INTEGER := 0;
      BEGIN
        -- Get all user IDs that have profiles
        SELECT ARRAY_AGG(p.user_id) INTO users_array
        FROM profiles p
        INNER JOIN auth.users u ON u.id = p.user_id
        WHERE p.user_id IS NOT NULL;
        
        user_count := COALESCE(array_length(users_array, 1), 0);
        
        -- Need at least 3 users
        IF user_count < 3 THEN
          RAISE NOTICE 'Not enough users for trio formation (found: %)', user_count;
          RETURN;
        END IF;
        
        -- Clear existing trios for today
        DELETE FROM trios WHERE date = CURRENT_DATE;
        
        -- Shuffle the array using Fisher-Yates algorithm
        shuffled_users := users_array;
        FOR i IN REVERSE user_count..2 LOOP
          rand_pos := floor(random() * i) + 1;
          temp := shuffled_users[i];
          shuffled_users[i] := shuffled_users[rand_pos];
          shuffled_users[rand_pos] := temp;
        END LOOP;
        
        -- Create new trios (groups of 3)
        i := 1;
        WHILE i <= user_count - 2 LOOP
          -- Verify all three users exist before inserting
          IF shuffled_users[i] IS NOT NULL AND 
             shuffled_users[i + 1] IS NOT NULL AND 
             shuffled_users[i + 2] IS NOT NULL THEN
            
            INSERT INTO trios (date, user1_id, user2_id, user3_id)
            VALUES (
              CURRENT_DATE,
              shuffled_users[i],
              shuffled_users[i + 1],
              shuffled_users[i + 2]
            );
            trio_count := trio_count + 1;
          END IF;
          i := i + 3;
        END LOOP;
        
        RAISE NOTICE 'Created % trios from % users', trio_count, user_count;
        RETURN;
      END;
      $$
    `);

    console.log('✅ randomize_trios function updated!');

    // Test the function
    console.log('\n🧪 Testing randomize_trios...');
    
    // First check how many users we have
    const { rows: userCount } = await pgClient.query(`
      SELECT COUNT(*) as count 
      FROM profiles p
      INNER JOIN auth.users u ON u.id = p.user_id
    `);
    
    console.log(`Total valid users: ${userCount[0].count}`);

    if (userCount[0].count >= 3) {
      await pgClient.query('SELECT randomize_trios()');
      
      // Check if trios were created
      const { rows: trios } = await pgClient.query(`
        SELECT COUNT(*) as count FROM trios WHERE date = CURRENT_DATE
      `);
      
      console.log(`✅ Success! Created ${trios[0].count} trios for today`);
    } else {
      console.log('⚠️ Still need more users. Run setup_local.js to create users.');
    }

    console.log('\n🎉 Randomize Trios button will now work!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pgClient.end();
  }
}

fixRandomizeTrios();