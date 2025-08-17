#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTrios() {
  console.log('\n🔍 CHECKING TRIO STATE...\n');

  // 1. Check today's trios
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today's date: ${today}\n`);

  const { data: trios, error: trioError } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today);

  if (trioError) {
    console.error('❌ Error fetching trios:', trioError);
    return;
  }

  console.log(`📊 Trios for today: ${trios?.length || 0}`);
  
  if (trios && trios.length > 0) {
    console.log('\nTrio details:');
    trios.forEach((trio, i) => {
      console.log(`  Trio ${i + 1}:`);
      console.log(`    - ID: ${trio.id}`);
      console.log(`    - User1: ${trio.user1_id}`);
      console.log(`    - User2: ${trio.user2_id}`);
      console.log(`    - User3: ${trio.user3_id}`);
      console.log(`    - User4: ${trio.user4_id || 'null'}`);
      console.log(`    - User5: ${trio.user5_id || 'null'}`);
      console.log(`    - Created: ${trio.created_at}`);
    });
  }

  // 2. Now let's randomize
  console.log('\n🎲 CALLING RANDOMIZE...');
  const { data: randomResult, error: randomError } = await supabase.rpc('randomize_trios');
  
  if (randomError) {
    console.error('❌ Error:', randomError);
  } else {
    console.log('✅ Result:', JSON.stringify(randomResult, null, 2));
  }

  // 3. Check again after randomize
  console.log('\n📊 CHECKING TRIOS AFTER RANDOMIZE...');
  const { data: triosAfter, error: trioError2 } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today);

  console.log(`Trios after randomize: ${triosAfter?.length || 0}`);

  // 4. Check ALL trios (not just today)
  console.log('\n📊 ALL TRIOS IN DATABASE:');
  const { data: allTrios, count } = await supabase
    .from('trios')
    .select('date, id', { count: 'exact' })
    .order('date', { ascending: false })
    .limit(10);

  console.log(`Total trios in database: ${count}`);
  if (allTrios && allTrios.length > 0) {
    console.log('Recent trio dates:');
    const dateGroups = {};
    allTrios.forEach(trio => {
      if (!dateGroups[trio.date]) {
        dateGroups[trio.date] = 0;
      }
      dateGroups[trio.date]++;
    });
    
    Object.entries(dateGroups).forEach(([date, count]) => {
      console.log(`  ${date}: ${count} trios`);
    });
  }

  // 5. Check profiles to make sure they exist
  console.log('\n👥 CHECKING PROFILES:');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .limit(5);

  console.log(`Sample profiles:`);
  profiles?.forEach(p => {
    console.log(`  - ${p.id}: ${p.username || 'no username'}`);
  });
}

checkTrios().catch(console.error);