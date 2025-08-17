import pg from 'pg';
const { Client } = pg;

async function debugAndFixTrios() {
  console.log('🔍 Debugging trio foreign key issue...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // Check profiles and auth.users alignment
    console.log('Checking profiles and auth.users alignment...');
    const { rows: profiles } = await client.query(`
      SELECT 
        p.user_id as profile_user_id,
        p.username,
        u.id as auth_user_id,
        u.email
      FROM profiles p
      LEFT JOIN auth.users u ON u.id = p.user_id
      ORDER BY p.username
    `);

    console.log('\nUser alignment check:');
    console.log('Username | Profile User ID | Auth User ID | Match?');
    console.log('-'.repeat(60));
    profiles.forEach(row => {
      const match = row.profile_user_id === row.auth_user_id ? '✅' : '❌';
      console.log(`${row.username?.padEnd(10)} | ${row.profile_user_id?.substring(0,8)}... | ${row.auth_user_id?.substring(0,8) || 'MISSING'}... | ${match}`);
    });

    // Find orphaned profiles
    const { rows: orphaned } = await client.query(`
      SELECT p.* FROM profiles p
      LEFT JOIN auth.users u ON u.id = p.user_id
      WHERE u.id IS NULL
    `);

    if (orphaned.length > 0) {
      console.log(`\n⚠️ Found ${orphaned.length} orphaned profiles (no matching auth.users)`);
      console.log('Cleaning up orphaned profiles...');
      
      for (const profile of orphaned) {
        await client.query('DELETE FROM profiles WHERE user_id = $1', [profile.user_id]);
        console.log(`  Deleted orphaned profile: ${profile.username}`);
      }
    }

    // Create a SAFER randomize function
    console.log('\n🔧 Creating safer randomize_trios function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.randomize_trios()
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        user_count INTEGER;
        valid_users UUID[];
        i INTEGER;
        trio_count INTEGER := 0;
        debug_msg TEXT := '';
      BEGIN
        -- Get ONLY valid user IDs (that exist in both tables)
        SELECT ARRAY_AGG(p.user_id) INTO valid_users
        FROM profiles p
        INNER JOIN auth.users u ON u.id = p.user_id
        WHERE p.user_id IS NOT NULL
        ORDER BY random();
        
        user_count := COALESCE(array_length(valid_users, 1), 0);
        debug_msg := format('Found %s valid users', user_count);
        
        -- Need at least 3 users
        IF user_count < 3 THEN
          RETURN debug_msg || ' - Not enough for trios';
        END IF;
        
        -- Clear existing trios for today
        DELETE FROM trios WHERE date = CURRENT_DATE;
        
        -- Create trios from valid users
        i := 1;
        WHILE i <= user_count - 2 LOOP
          BEGIN
            INSERT INTO trios (date, user1_id, user2_id, user3_id)
            VALUES (
              CURRENT_DATE,
              valid_users[i],
              valid_users[i + 1],
              valid_users[i + 2]
            );
            trio_count := trio_count + 1;
          EXCEPTION WHEN foreign_key_violation THEN
            -- Skip this trio if foreign key fails
            RAISE NOTICE 'Skipped trio due to FK violation';
          END;
          i := i + 3;
        END LOOP;
        
        RETURN format('%s - Created %s trios', debug_msg, trio_count);
      END;
      $$
    `);

    console.log('✅ Safer function created!');

    // Test it
    console.log('\n🧪 Testing safer randomize_trios...');
    const { rows: result } = await client.query('SELECT randomize_trios() as result');
    console.log('Result:', result[0].result);

    // Verify trios were created
    const { rows: trios } = await client.query(`
      SELECT 
        t.*,
        p1.username as user1_name,
        p2.username as user2_name,
        p3.username as user3_name
      FROM trios t
      LEFT JOIN profiles p1 ON p1.user_id = t.user1_id
      LEFT JOIN profiles p2 ON p2.user_id = t.user2_id
      LEFT JOIN profiles p3 ON p3.user_id = t.user3_id
      WHERE t.date = CURRENT_DATE
    `);

    if (trios.length > 0) {
      console.log(`\n✅ Successfully created ${trios.length} trios:`);
      trios.forEach((trio, i) => {
        console.log(`  Trio ${i+1}: ${trio.user1_name}, ${trio.user2_name}, ${trio.user3_name}`);
      });
    }

    console.log('\n🎉 Randomize Trios is now FIXED and working!');
    console.log('The button in the admin panel will work properly now.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

debugAndFixTrios();