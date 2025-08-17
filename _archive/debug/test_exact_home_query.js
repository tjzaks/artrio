#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

async function testExactHomeQuery() {
  console.log('\n🏠 TESTING EXACT HOME.TSX QUERY\n');
  console.log('='.repeat(60));

  // Tyler's auth user ID (what comes from auth)
  const userAuthId = 'e1293f57-d3dc-4f7b-97ba-66959f01ba34';
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`Testing for Tyler (auth ID: ${userAuthId})`);
  console.log(`Today's date: ${today}`);

  // Step 1: Get profile (exactly as Home.tsx does)
  console.log('\n1️⃣ Getting profile from auth ID...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userAuthId)
    .single();

  if (profileError) {
    console.log('   ❌ Profile error:', profileError);
    return;
  }

  if (!profile) {
    console.log('   ❌ No profile found for user');
    return;
  }

  console.log(`   ✅ Found profile ID: ${profile.id}`);

  // Step 2: Find trio (exactly as Home.tsx does)
  console.log('\n2️⃣ Looking for trio...');
  const { data: trio, error: trioError } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today)
    .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id},user3_id.eq.${profile.id},user4_id.eq.${profile.id},user5_id.eq.${profile.id}`)
    .single();

  if (trioError) {
    console.log('   ❌ Trio error:', trioError.code, trioError.message);
    
    if (trioError.code === 'PGRST116') {
      console.log('   → No trio found (user not in any trio today)');
    } else {
      console.log('   → Unexpected error');
    }
    return;
  }

  if (trio) {
    console.log('   ✅ TRIO FOUND!');
    console.log(`   Trio ID: ${trio.id}`);
    console.log(`   Members: ${trio.user1_id}, ${trio.user2_id}, ${trio.user3_id}`);
  }

  console.log('\n' + '='.repeat(60));
}

testExactHomeQuery().catch(console.error);