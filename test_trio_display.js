#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

async function testTrioDisplay() {
  console.log('\n🔍 TESTING TRIO DISPLAY LOGIC\n');

  // Simulate Tyler being logged in
  const authUserId = 'e1293f57-d3dc-4f7b-97ba-66959f01ba34'; // Tyler's auth.users ID
  console.log(`Simulating logged in as Tyler (auth ID: ${authUserId})\n`);

  // Step 1: Get profile ID from auth user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .single();

  if (!profile) {
    console.log('❌ No profile found for this auth user!');
    return;
  }

  console.log(`✅ Found profile ID: ${profile.id}\n`);

  // Step 2: Find trio using PROFILE ID
  const today = new Date().toISOString().split('T')[0];
  console.log(`Looking for trios on ${today} with profile ID ${profile.id}...\n`);

  const { data: trio, error: trioError } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today)
    .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id},user3_id.eq.${profile.id}`)
    .single();

  if (trioError) {
    console.log('❌ Error fetching trio:', trioError.message);
    if (trioError.code === 'PGRST116') {
      console.log('   (No trio found for this user today)');
    }
    return;
  }

  if (trio) {
    console.log('🎉 TRIO FOUND!');
    console.log(`   Trio ID: ${trio.id}`);
    console.log(`   User 1: ${trio.user1_id}`);
    console.log(`   User 2: ${trio.user2_id}`);  
    console.log(`   User 3: ${trio.user3_id}`);
    
    // Get usernames
    const userIds = [trio.user1_id, trio.user2_id, trio.user3_id].filter(Boolean);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);
    
    console.log('\n   Members:');
    profiles?.forEach(p => {
      const isYou = p.id === profile.id;
      console.log(`   - ${p.username}${isYou ? ' (YOU)' : ''}`);
    });
  }
}

testTrioDisplay().catch(console.error);