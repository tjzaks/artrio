#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

async function testWithoutSingle() {
  console.log('\n🔍 TESTING QUERY WITHOUT .single()\n');
  
  const profileId = 'f1fc4b18-731e-4768-83f7-5ac90e42e037';
  const today = new Date().toISOString().split('T')[0];
  
  // Test without .single()
  const { data: trios, error } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today)
    .or(`user1_id.eq.${profileId},user2_id.eq.${profileId},user3_id.eq.${profileId},user4_id.eq.${profileId},user5_id.eq.${profileId}`);

  if (error) {
    console.log('Error:', error);
  } else {
    console.log(`Found ${trios?.length} trios`);
    trios?.forEach((trio, i) => {
      console.log(`\nTrio ${i + 1}:`);
      console.log(`  ID: ${trio.id}`);
      console.log(`  Tyler is: ${
        trio.user1_id === profileId ? 'user1' :
        trio.user2_id === profileId ? 'user2' :
        trio.user3_id === profileId ? 'user3' : 'not in this trio(?)'
      }`);
    });
  }
}

testWithoutSingle().catch(console.error);