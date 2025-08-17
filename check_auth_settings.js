#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

async function testAuth() {
  console.log('\n🔐 TESTING AUTHENTICATION\n');
  console.log('='.repeat(50));

  // Test signup
  console.log('\n1️⃣ Testing signup for Toby...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'toby@test.com',
    password: 'TestPassword123!',
    options: {
      data: {
        username: 'toby'
      }
    }
  });

  if (signUpError) {
    console.log('   ❌ Signup error:', signUpError.message);
    
    // Try login instead
    console.log('\n2️⃣ Trying login for existing user...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'toby@test.com',
      password: 'TestPassword123!'
    });

    if (loginError) {
      console.log('   ❌ Login error:', loginError.message);
    } else {
      console.log('   ✅ Login successful!');
      console.log('   User ID:', loginData.user?.id);
    }
  } else {
    console.log('   ✅ Signup successful!');
    console.log('   User ID:', signUpData.user?.id);
    console.log('   Email:', signUpData.user?.email);
  }

  // Check if profile was created
  console.log('\n3️⃣ Checking profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, user_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (profiles) {
    console.log('   Recent profiles:');
    profiles.forEach(p => {
      console.log(`   • ${p.username} (${p.id})`);
    });
  }

  // Test site URL
  console.log('\n4️⃣ Site URLs:');
  console.log('   Production: https://artrio-production.up.railway.app');
  console.log('   Auth redirect: https://artrio-production.up.railway.app/auth/callback');
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ AUTH TEST COMPLETE\n');
}

testAuth().catch(console.error);