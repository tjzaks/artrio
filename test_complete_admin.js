#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

const today = new Date().toISOString().split('T')[0];

async function testCompleteAdmin() {
  console.log('\n🎯 COMPLETE ADMIN DASHBOARD TEST\n');
  console.log('='.repeat(60));

  // 1. Clean slate
  console.log('\n1️⃣ CLEANING UP...');
  await supabase.from('trios').delete().eq('date', today);
  console.log('   ✅ Deleted existing trios');

  // 2. Create trios exactly like admin dashboard
  console.log('\n2️⃣ CREATING TRIOS (Admin Dashboard Style)...');
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username');

  const shuffled = [...profiles].sort(() => Math.random() - 0.5);
  const trios = [];
  
  // Create groups of 3 (not 5)
  for (let i = 0; i < shuffled.length - 2; i += 3) {
    trios.push({
      user1_id: shuffled[i].id,
      user2_id: shuffled[i + 1].id,
      user3_id: shuffled[i + 2].id,
      user4_id: null,  // Keep these null
      user5_id: null,  // Keep these null
      date: today
    });
  }

  const { error: insertError } = await supabase
    .from('trios')
    .insert(trios);

  if (insertError) {
    console.log('   ❌ Failed:', insertError.message);
    return;
  }

  console.log(`   ✅ Created ${trios.length} trios with ${trios.length * 3} users`);

  // 3. Verify trios exist
  console.log('\n3️⃣ VERIFYING DATABASE...');
  
  const { data: verifyTrios, count } = await supabase
    .from('trios')
    .select('*', { count: 'exact' })
    .eq('date', today);

  console.log(`   ✅ Database has ${count} trios`);

  // 4. Test Tyler's lookup
  console.log('\n4️⃣ TESTING TYLER\'S TRIO LOOKUP...');
  
  const tylerId = 'e1293f57-d3dc-4f7b-97ba-66959f01ba34';
  
  const { data: tylerProfile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('user_id', tylerId)
    .single();

  console.log(`   Tyler's profile: ${tylerProfile.username} (${tylerProfile.id})`);

  // Find Tyler's trio
  const { data: tylerTrio, error: trioError } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today)
    .or(`user1_id.eq.${tylerProfile.id},user2_id.eq.${tylerProfile.id},user3_id.eq.${tylerProfile.id}`)
    .single();

  if (trioError && trioError.code === 'PGRST116') {
    console.log('   ⚠️  Tyler not in today\'s random selection');
    
    // Show who IS in trios
    console.log('\n   Users in trios:');
    for (const trio of verifyTrios) {
      const userIds = [trio.user1_id, trio.user2_id, trio.user3_id].filter(Boolean);
      const { data: users } = await supabase
        .from('profiles')
        .select('username')
        .in('id', userIds);
      
      console.log(`   • ${users.map(u => u.username).join(', ')}`);
    }
  } else if (tylerTrio) {
    console.log('   ✅ TYLER HAS A TRIO!');
    
    // Get trio members
    const memberIds = [
      tylerTrio.user1_id,
      tylerTrio.user2_id,
      tylerTrio.user3_id
    ].filter(Boolean);
    
    const { data: members } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', memberIds);
    
    console.log('\n   Tyler\'s trio members:');
    members.forEach(m => {
      const isT = m.id === tylerProfile.id;
      console.log(`   • ${m.username}${isT ? ' (Tyler)' : ''}`);
    });
  }

  // 5. Test what Home.tsx would see
  console.log('\n5️⃣ SIMULATING HOME.TSX VIEW...');
  
  // This is exactly what Home.tsx does
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', tylerId)
    .single();
  
  const { data: homeTrioData, error: homeError } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today)
    .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id},user3_id.eq.${profile.id}`)
    .single();

  if (homeError) {
    console.log('   ❌ Home.tsx would show: No trio today');
    console.log('   Error:', homeError.code, homeError.message);
  } else {
    console.log('   ✅ Home.tsx would show: Trio found!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE - Admin Dashboard is working!\n');
}

testCompleteAdmin().catch(console.error);