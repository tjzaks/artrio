#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

async function testAdminFunctions() {
  console.log('\n🔧 TESTING ADMIN FUNCTIONS\n');
  console.log('='.repeat(50));

  // 1. Check current state
  console.log('\n1️⃣ CURRENT STATE:');
  const today = new Date().toISOString().split('T')[0];
  
  const { count: profileCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  const { data: existingTrios, count: trioCount } = await supabase
    .from('trios')
    .select('*', { count: 'exact' })
    .eq('date', today);

  console.log(`   • Total profiles: ${profileCount}`);
  console.log(`   • Today's trios: ${trioCount || 0}`);

  // 2. Delete existing trios
  console.log('\n2️⃣ DELETING TODAY\'S TRIOS:');
  const { error: deleteError } = await supabase
    .from('trios')
    .delete()
    .eq('date', today);

  if (deleteError) {
    console.log('   ❌ Delete failed:', deleteError.message);
  } else {
    console.log('   ✅ Deleted successfully');
  }

  // 3. Create new trios manually (like the admin function does)
  console.log('\n3️⃣ CREATING NEW TRIOS:');
  
  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username');

  if (!profiles || profiles.length < 3) {
    console.log('   ❌ Not enough profiles to create trios');
    return;
  }

  // Shuffle and create trios
  const shuffled = [...profiles].sort(() => Math.random() - 0.5);
  const trios = [];
  
  for (let i = 0; i < shuffled.length - 2; i += 3) {
    if (i + 2 < shuffled.length) {
      trios.push({
        user1_id: shuffled[i].id,
        user2_id: shuffled[i + 1].id,
        user3_id: shuffled[i + 2].id,
        user4_id: shuffled[i + 3]?.id || null,
        user5_id: shuffled[i + 4]?.id || null,
        date: today
      });
    }
  }

  console.log(`   • Creating ${trios.length} trios...`);

  const { error: insertError } = await supabase
    .from('trios')
    .insert(trios);

  if (insertError) {
    console.log('   ❌ Insert failed:', insertError.message);
    console.log('   Details:', insertError);
  } else {
    console.log(`   ✅ Created ${trios.length} trios successfully!`);
  }

  // 4. Verify creation
  console.log('\n4️⃣ VERIFYING TRIOS:');
  
  const { data: newTrios, count: newCount } = await supabase
    .from('trios')
    .select('*', { count: 'exact' })
    .eq('date', today);

  console.log(`   • Trios in database: ${newCount || 0}`);
  
  if (newTrios && newTrios.length > 0) {
    console.log('\n   Details:');
    newTrios.forEach((trio, index) => {
      let userCount = 0;
      if (trio.user1_id) userCount++;
      if (trio.user2_id) userCount++;
      if (trio.user3_id) userCount++;
      if (trio.user4_id) userCount++;
      if (trio.user5_id) userCount++;
      
      console.log(`   Trio ${index + 1}: ${userCount} users`);
    });
  }

  // 5. Test user's trio lookup
  console.log('\n5️⃣ TESTING USER TRIO LOOKUP:');
  
  // Use Tyler's ID
  const tylerId = 'e1293f57-d3dc-4f7b-97ba-66959f01ba34';
  
  // Get Tyler's profile ID
  const { data: tylerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', tylerId)
    .single();

  if (tylerProfile) {
    console.log(`   Tyler's profile ID: ${tylerProfile.id}`);
    
    // Look for Tyler's trio
    const { data: tylerTrio } = await supabase
      .from('trios')
      .select('*')
      .eq('date', today)
      .or(`user1_id.eq.${tylerProfile.id},user2_id.eq.${tylerProfile.id},user3_id.eq.${tylerProfile.id}`)
      .single();

    if (tylerTrio) {
      console.log('   ✅ Tyler has a trio today!');
      console.log(`   Trio ID: ${tylerTrio.id}`);
    } else {
      console.log('   ❌ Tyler has no trio (might not be in the random selection)');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Admin functions test complete!');
}

testAdminFunctions().catch(console.error);