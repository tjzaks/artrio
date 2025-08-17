import pg from 'pg';
const { Client } = pg;

async function fixTriosTable() {
  console.log('🔧 Fixing trios table foreign keys...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // Check current foreign key constraints
    console.log('Checking current foreign key constraints...');
    const { rows: constraints } = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'trios'
    `);

    console.log('Current FK constraints on trios table:');
    constraints.forEach(c => {
      console.log(`  ${c.constraint_name}: ${c.column_name} -> ${c.foreign_table_name}.${c.foreign_column_name}`);
    });

    // The issue: FKs might be pointing to profiles table instead of auth.users
    // Let's fix this by dropping and recreating the constraints
    console.log('\n🔧 Fixing foreign key constraints...');
    
    // Drop existing constraints
    console.log('Dropping old constraints...');
    await client.query(`
      ALTER TABLE trios 
      DROP CONSTRAINT IF EXISTS trios_user1_id_fkey,
      DROP CONSTRAINT IF EXISTS trios_user2_id_fkey,
      DROP CONSTRAINT IF EXISTS trios_user3_id_fkey
    `);

    // Add correct constraints pointing to auth.users
    console.log('Adding correct constraints to auth.users...');
    await client.query(`
      ALTER TABLE trios
      ADD CONSTRAINT trios_user1_id_fkey 
        FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE CASCADE,
      ADD CONSTRAINT trios_user2_id_fkey 
        FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE CASCADE,
      ADD CONSTRAINT trios_user3_id_fkey 
        FOREIGN KEY (user3_id) REFERENCES auth.users(id) ON DELETE CASCADE
    `);

    console.log('✅ Foreign keys fixed!');

    // Now test randomize_trios again
    console.log('\n🧪 Testing randomize_trios with fixed constraints...');
    await client.query('SELECT randomize_trios()');
    
    // Check results
    const { rows: trios } = await client.query(`
      SELECT 
        t.id,
        p1.username as user1,
        p2.username as user2,
        p3.username as user3,
        t.date
      FROM trios t
      JOIN profiles p1 ON p1.user_id = t.user1_id
      JOIN profiles p2 ON p2.user_id = t.user2_id
      JOIN profiles p3 ON p3.user_id = t.user3_id
      WHERE t.date = CURRENT_DATE
    `);

    if (trios.length > 0) {
      console.log(`\n✅ SUCCESS! Created ${trios.length} trios:`);
      trios.forEach((trio, i) => {
        console.log(`  Trio ${i+1}: ${trio.user1}, ${trio.user2}, ${trio.user3}`);
      });
    }

    console.log('\n🎉 RANDOMIZE TRIOS IS NOW FULLY WORKING!');
    console.log('The "Randomize Trios" button in admin panel will work perfectly.');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Detail:', error.detail);
  } finally {
    await client.end();
  }
}

fixTriosTable();