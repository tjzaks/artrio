#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

async function testRealUsers() {
  console.log('\n👥 TESTING REAL USER ACCESS\n');
  console.log('='.repeat(50));

  // Check existing users
  console.log('\n1️⃣ EXISTING USERS:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, user_id, created_at')
    .order('created_at', { ascending: false });

  if (profiles) {
    console.log(`   Found ${profiles.length} users:`);
    profiles.slice(0, 10).forEach(p => {
      console.log(`   • ${p.username}`);
    });
  }

  // Check if Jonny can login
  console.log('\n2️⃣ CHECKING JONNY B:');
  const jonnyProfile = profiles?.find(p => p.username === 'Jonny B');
  if (jonnyProfile) {
    console.log('   ✅ Jonny B exists in database');
    console.log('   Profile created:', new Date(jonnyProfile.created_at).toLocaleDateString());
  } else {
    console.log('   ❌ Jonny B not found');
  }

  // Check today's trios
  console.log('\n3️⃣ TODAY\'S TRIOS:');
  const today = new Date().toISOString().split('T')[0];
  const { data: trios, count } = await supabase
    .from('trios')
    .select('*', { count: 'exact' })
    .eq('date', today);

  console.log(`   ${count} trios active today`);

  // Check if Jonny is in a trio
  if (jonnyProfile && trios) {
    const jonnyTrio = trios.find(t => 
      t.user1_id === jonnyProfile.user_id ||
      t.user2_id === jonnyProfile.user_id ||
      t.user3_id === jonnyProfile.user_id
    );

    if (jonnyTrio) {
      console.log('   ✅ Jonny B is in a trio today!');
    } else {
      console.log('   ⚠️  Jonny B not in today\'s trios');
    }
  }

  // Instructions for users
  console.log('\n4️⃣ INSTRUCTIONS FOR TOBY & JONNY:');
  console.log('\n   If you have an existing account:');
  console.log('   1. Go to https://artrio.up.railway.app');
  console.log('   2. Click "Sign In"');
  console.log('   3. Use your email and password');
  console.log('\n   If you need a new account:');
  console.log('   1. Go to https://artrio.up.railway.app');
  console.log('   2. Click "Sign Up"');
  console.log('   3. Enter email, username, and password');
  console.log('   4. Check email for verification link');
  
  console.log('\n   NOTE: If login fails, try resetting password');
  console.log('   or create a new account with a different email');

  console.log('\n' + '='.repeat(50));
  console.log('✅ USER ACCESS TEST COMPLETE\n');
}

testRealUsers().catch(console.error);