#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

async function debugTrioIssue() {
  console.log('\n🔍 DEBUGGING TRIO DISPLAY ISSUE\n');
  console.log('='.repeat(60));

  const today = new Date().toISOString().split('T')[0];
  
  // 1. Check what's in the trios table
  console.log('1️⃣ TRIOS IN DATABASE:');
  const { data: trios } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today);

  console.log(`   Found ${trios?.length || 0} trios for ${today}`);
  
  if (trios && trios.length > 0) {
    console.log('\n   Trio user IDs:');
    trios.forEach((trio, i) => {
      console.log(`   Trio ${i + 1}:`);
      console.log(`     user1: ${trio.user1_id}`);
      console.log(`     user2: ${trio.user2_id}`);
      console.log(`     user3: ${trio.user3_id}`);
    });
  }

  // 2. Check profiles table structure
  console.log('\n2️⃣ CHECKING PROFILE STRUCTURE:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, username')
    .limit(3);

  console.log('\n   Sample profiles:');
  profiles?.forEach(p => {
    console.log(`   ${p.username}:`);
    console.log(`     profile.id: ${p.id}`);
    console.log(`     profile.user_id: ${p.user_id}`);
  });

  // 3. Check Tyler's specific case
  console.log('\n3️⃣ TYLER\'S SPECIFIC CASE:');
  const tylerAuthId = 'e1293f57-d3dc-4f7b-97ba-66959f01ba34';
  
  const { data: tylerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', tylerAuthId)
    .single();

  if (tylerProfile) {
    console.log(`   Tyler's profile.id: ${tylerProfile.id}`);
    console.log(`   Tyler's user_id: ${tylerProfile.user_id}`);
    
    // Check if Tyler's PROFILE ID is in any trio
    const tylerInTrio = trios?.find(t => 
      t.user1_id === tylerProfile.id ||
      t.user2_id === tylerProfile.id ||
      t.user3_id === tylerProfile.id
    );

    if (tylerInTrio) {
      console.log('   ✅ Tyler IS in a trio (using profile.id)');
    } else {
      console.log('   ❌ Tyler NOT in a trio');
      
      // Check if user_id was used by mistake
      const wrongMatch = trios?.find(t => 
        t.user1_id === tylerProfile.user_id ||
        t.user2_id === tylerProfile.user_id ||
        t.user3_id === tylerProfile.user_id
      );
      
      if (wrongMatch) {
        console.log('   ⚠️  PROBLEM: Trio has user_id instead of profile.id!');
      }
    }
  }

  // 4. THE ACTUAL PROBLEM
  console.log('\n4️⃣ IDENTIFYING THE PROBLEM:');
  
  // Get a trio and check what kind of IDs it has
  if (trios && trios.length > 0) {
    const firstTrio = trios[0];
    
    // Check if the ID in trio matches profile.id or user_id
    const { data: checkProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', firstTrio.user1_id)
      .single();
    
    if (checkProfile) {
      console.log('   ✅ Trios are using profile.id (CORRECT)');
    } else {
      // Check if it's using user_id instead
      const { data: wrongProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', firstTrio.user1_id)
        .single();
      
      if (wrongProfile) {
        console.log('   ❌ Trios are using user_id (WRONG!)');
        console.log('   This is why Home.tsx can\'t find trios!');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}

debugTrioIssue().catch(console.error);