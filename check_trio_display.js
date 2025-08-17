import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

// LOCAL SUPABASE
const supabaseUrl = 'http://127.0.0.1:54321';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, anonKey);

async function checkTrioDisplay() {
  console.log('🔍 Debugging why trios are not showing...\n');

  const pgClient = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await pgClient.connect();

    // Check what's in the trios table
    console.log('1️⃣ Current trios in database:');
    const { rows: trios } = await pgClient.query(`
      SELECT 
        t.id,
        t.date,
        t.user1_id,
        t.user2_id,
        t.user3_id
      FROM trios t
      WHERE date = CURRENT_DATE
    `);

    console.log(`Found ${trios.length} trios for today:`);
    if (trios.length > 0) {
      console.log('Sample trio:', trios[0]);
    }

    // Check profile structure
    console.log('\n2️⃣ Profile structure:');
    const { rows: profiles } = await pgClient.query(`
      SELECT 
        p.id as profile_id,
        p.user_id as auth_user_id,
        p.username
      FROM profiles p
      LIMIT 3
    `);

    console.log('Sample profiles:');
    profiles.forEach(p => {
      console.log(`  ${p.username}: profile_id=${p.profile_id?.substring(0,8)}..., auth_user_id=${p.auth_user_id?.substring(0,8)}...`);
    });

    // THE PROBLEM!
    console.log('\n❌ THE PROBLEM:');
    console.log('  - Trios table stores AUTH USER IDs (from auth.users)');
    console.log('  - Home.tsx is looking for PROFILE IDs (from profiles.id)');
    console.log('  - These are DIFFERENT IDs!');
    
    console.log('\n3️⃣ Example mismatch:');
    if (trios.length > 0 && profiles.length > 0) {
      console.log(`  Trio user1_id: ${trios[0].user1_id}`);
      console.log(`  Profile ID: ${profiles[0].profile_id}`);
      console.log(`  Auth User ID: ${profiles[0].auth_user_id}`);
      console.log(`  Trio uses Auth User ID, not Profile ID!`);
    }

    // Login as Tyler to test the query
    console.log('\n4️⃣ Testing Tyler\'s trio lookup...');
    const { data: auth } = await supabase.auth.signInWithPassword({
      email: 'tyler@artrio.com',
      password: 'test123'
    });

    if (auth?.user) {
      console.log(`Tyler's auth ID: ${auth.user.id}`);
      
      // Get Tyler's profile
      const { data: tylerProfile } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('user_id', auth.user.id)
        .single();
      
      console.log(`Tyler's profile ID: ${tylerProfile?.id}`);
      console.log(`Tyler's auth user ID: ${tylerProfile?.user_id}`);

      // Check if Tyler is in any trio (using auth user ID)
      const tylerInTrio = trios.some(t => 
        t.user1_id === auth.user.id ||
        t.user2_id === auth.user.id ||
        t.user3_id === auth.user.id
      );

      console.log(`Tyler in trio (by auth ID): ${tylerInTrio}`);

      // Check if Tyler's PROFILE ID matches (it won't!)
      const tylerInTrioByProfile = trios.some(t => 
        t.user1_id === tylerProfile?.id ||
        t.user2_id === tylerProfile?.id ||
        t.user3_id === tylerProfile?.id
      );

      console.log(`Tyler in trio (by profile ID): ${tylerInTrioByProfile}`);
    }

    console.log('\n🔧 THE FIX:');
    console.log('  Home.tsx needs to compare trios against user_id (auth), not id (profile)');
    console.log('  Line 119-123 should use user?.id, not profile.id');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pgClient.end();
  }
}

checkTrioDisplay();