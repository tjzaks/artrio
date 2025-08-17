import pg from 'pg';
const { Client } = pg;

async function debugRandomize() {
  console.log('🔍 Debugging randomize trios...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // Check how many valid users we have
    console.log('Checking valid users (profiles with auth.users match)...');
    const { rows: validUsers } = await client.query(`
      SELECT p.user_id, p.username
      FROM profiles p
      INNER JOIN auth.users u ON u.id = p.user_id
      ORDER BY p.username
    `);

    console.log(`Found ${validUsers.length} valid users:`);
    validUsers.forEach(u => console.log(`  • ${u.username}`));

    // Clear existing trios
    console.log('\nClearing existing trios...');
    await client.query('DELETE FROM trios WHERE date = CURRENT_DATE');

    // Manually create trios with the valid users
    console.log('\nManually creating trios...');
    
    if (validUsers.length >= 3) {
      let trioCount = 0;
      for (let i = 0; i < validUsers.length - 2; i += 3) {
        const trio = {
          user1: validUsers[i],
          user2: validUsers[i + 1],
          user3: validUsers[i + 2]
        };
        
        console.log(`\nCreating Trio ${trioCount + 1}:`);
        console.log(`  • ${trio.user1.username}`);
        console.log(`  • ${trio.user2.username}`);
        console.log(`  • ${trio.user3.username}`);
        
        const { rows } = await client.query(`
          INSERT INTO trios (date, user1_id, user2_id, user3_id)
          VALUES (CURRENT_DATE, $1, $2, $3)
          RETURNING id
        `, [trio.user1.user_id, trio.user2.user_id, trio.user3.user_id]);
        
        if (rows[0]) {
          console.log(`  ✅ Created with ID: ${rows[0].id}`);
          trioCount++;
        }
      }
      
      console.log(`\n✅ Successfully created ${trioCount} trios!`);
    }

    // Verify trios exist
    const { rows: allTrios } = await client.query(`
      SELECT * FROM trios WHERE date = CURRENT_DATE
    `);
    
    console.log(`\n📊 Trios in database: ${allTrios.length}`);

    // Check if the randomize function sees users
    console.log('\n🔧 Testing what randomize_trios function sees...');
    const { rows: functionTest } = await client.query(`
      SELECT ARRAY_AGG(p.user_id) as user_ids
      FROM profiles p
      INNER JOIN auth.users u ON u.id = p.user_id
      WHERE p.user_id IS NOT NULL
    `);
    
    const userArray = functionTest[0].user_ids;
    console.log(`Function would see ${userArray?.length || 0} users`);

    console.log('\n✅ Trios are now created and available!');
    console.log('The admin panel should show them correctly.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

debugRandomize();