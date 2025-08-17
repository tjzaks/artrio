#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

async function createTriosNow() {
  console.log('\n🎲 CREATING TRIOS FOR TODAY\n');
  console.log('='.repeat(50));

  const today = new Date().toISOString().split('T')[0];

  // 1. Delete any existing trios for today
  console.log('1️⃣ Cleaning up old trios...');
  await supabase.from('trios').delete().eq('date', today);

  // 2. Get all profiles
  console.log('2️⃣ Getting all users...');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username');

  console.log(`   Found ${profiles.length} users`);

  // 3. Shuffle and create trios
  console.log('3️⃣ Creating new trios...');
  const shuffled = [...profiles].sort(() => Math.random() - 0.5);
  const trios = [];

  for (let i = 0; i < shuffled.length - 2; i += 3) {
    const trio = {
      user1_id: shuffled[i].id,
      user2_id: shuffled[i + 1].id,
      user3_id: shuffled[i + 2].id,
      user4_id: null,
      user5_id: null,
      date: today
    };
    trios.push(trio);
    
    console.log(`   Trio ${trios.length}: ${shuffled[i].username}, ${shuffled[i + 1].username}, ${shuffled[i + 2].username}`);
  }

  // 4. Insert trios
  const { error } = await supabase
    .from('trios')
    .insert(trios);

  if (error) {
    console.log('   ❌ Error:', error.message);
    return;
  }

  console.log(`\n✅ Created ${trios.length} trios successfully!`);

  // 5. Check specific users
  console.log('\n4️⃣ Checking key users:');
  
  // Check Tyler
  const tylerProfile = profiles.find(p => p.username === 'tyler');
  if (tylerProfile) {
    const tylerTrio = trios.find(t => 
      t.user1_id === tylerProfile.id ||
      t.user2_id === tylerProfile.id ||
      t.user3_id === tylerProfile.id
    );
    console.log(`   Tyler: ${tylerTrio ? '✅ In a trio' : '❌ Not in a trio'}`);
  }

  // Check Jonny B
  const jonnyProfile = profiles.find(p => p.username === 'Jonny B');
  if (jonnyProfile) {
    const jonnyTrio = trios.find(t => 
      t.user1_id === jonnyProfile.id ||
      t.user2_id === jonnyProfile.id ||
      t.user3_id === jonnyProfile.id
    );
    console.log(`   Jonny B: ${jonnyTrio ? '✅ In a trio' : '❌ Not in a trio'}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 TRIOS READY! Users can now login and see their trios.\n');
  console.log('Site: https://artrio.up.railway.app\n');
}

createTriosNow().catch(console.error);