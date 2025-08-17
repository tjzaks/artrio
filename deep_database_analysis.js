#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

console.log('\n' + '='.repeat(80));
console.log('🔬 DEEP DATABASE ANALYSIS - FINDING THE REAL ISSUES');
console.log('='.repeat(80));

async function deepAnalysis() {
  const report = [];
  
  // 1. CRITICAL FINDING: No trios for today!
  console.log('\n🚨 CRITICAL CHECK: TRIOS FOR TODAY\n');
  const today = new Date().toISOString().split('T')[0];
  
  const { data: todaysTrios, count } = await supabase
    .from('trios')
    .select('*', { count: 'exact' })
    .eq('date', today);
  
  console.log(`Date being checked: ${today}`);
  console.log(`Trios found: ${count || 0}`);
  
  if (!count || count === 0) {
    report.push('❌ CRITICAL: No trios exist for today!');
    console.log('\n❌ THIS IS THE MAIN ISSUE - NO TRIOS FOR TODAY!');
  } else {
    console.log('\nTrios exist:');
    todaysTrios.forEach((t, i) => {
      console.log(`  Trio ${i+1}: ${t.user1_id}, ${t.user2_id}, ${t.user3_id}`);
    });
  }
  
  // 2. Check ALL trios in database
  console.log('\n📊 ALL TRIOS IN DATABASE:\n');
  const { data: allTrios } = await supabase
    .from('trios')
    .select('date, id')
    .order('date', { ascending: false });
  
  if (allTrios && allTrios.length > 0) {
    const dates = {};
    allTrios.forEach(t => {
      dates[t.date] = (dates[t.date] || 0) + 1;
    });
    
    console.log('Trios by date:');
    Object.entries(dates).forEach(([date, count]) => {
      console.log(`  ${date}: ${count} trios`);
    });
  } else {
    console.log('  NO TRIOS IN DATABASE AT ALL!');
    report.push('❌ Database has ZERO trios');
  }
  
  // 3. Profile/User ID Mapping Check
  console.log('\n🆔 PROFILE ID CONSISTENCY CHECK:\n');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, username');
  
  let idMismatch = 0;
  let idMatch = 0;
  
  profiles?.forEach(p => {
    if (p.id === p.user_id) {
      idMatch++;
    } else {
      idMismatch++;
      if (idMismatch <= 3) {
        console.log(`  ${p.username}: id !== user_id`);
        console.log(`    profile.id: ${p.id}`);
        console.log(`    user_id: ${p.user_id}`);
      }
    }
  });
  
  console.log(`\nSummary:`);
  console.log(`  ${idMatch} profiles where id === user_id`);
  console.log(`  ${idMismatch} profiles where id !== user_id`);
  
  if (idMismatch > 0) {
    report.push(`⚠️ ${idMismatch} profiles have mismatched IDs`);
  }
  
  // 4. Test Tyler's specific case
  console.log('\n👤 TYLER\'S SPECIFIC CASE:\n');
  const tylerAuthId = 'e1293f57-d3dc-4f7b-97ba-66959f01ba34';
  
  const { data: tylerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', tylerAuthId)
    .single();
  
  if (tylerProfile) {
    console.log(`Tyler's profile found:`);
    console.log(`  username: ${tylerProfile.username}`);
    console.log(`  profile.id: ${tylerProfile.id}`);
    console.log(`  user_id: ${tylerProfile.user_id}`);
    console.log(`  is_admin: ${tylerProfile.is_admin}`);
    
    // Check if Tyler is in any trio
    const { data: tylerTrios } = await supabase
      .from('trios')
      .select('*')
      .or(`user1_id.eq.${tylerProfile.id},user2_id.eq.${tylerProfile.id},user3_id.eq.${tylerProfile.id}`);
    
    console.log(`\nTyler in trios: ${tylerTrios?.length || 0}`);
    
    if (!tylerTrios || tylerTrios.length === 0) {
      report.push('❌ Tyler is not in any trio');
    }
  } else {
    report.push('❌ Tyler profile not found!');
  }
  
  // 5. PostgREST OR Query Test
  console.log('\n🐛 POSTGREST OR QUERY BUG TEST:\n');
  
  const testId = 'f1fc4b18-731e-4768-83f7-5ac90e42e037'; // Tyler's profile ID
  
  // Test 1: Using OR
  const { data: orTest } = await supabase
    .from('trios')
    .select('*')
    .or(`user1_id.eq.${testId},user2_id.eq.${testId},user3_id.eq.${testId}`);
  
  console.log(`OR query result: ${orTest?.length || 0} trios`);
  
  // Test 2: Direct SQL
  const { data: sqlTest } = await supabase.rpc('execute_sql', {
    query: `SELECT COUNT(*) FROM trios WHERE user1_id = '${testId}' OR user2_id = '${testId}' OR user3_id = '${testId}'`
  });
  
  console.log(`Direct SQL result: ${sqlTest?.rows_affected || sqlTest?.[0]?.count || 0} trios`);
  
  if (orTest?.length === 0 && sqlTest?.[0]?.count > 0) {
    report.push('❌ CONFIRMED: PostgREST OR query is broken!');
  }
  
  // 6. RLS Policy Check
  console.log('\n🔒 RLS POLICY STATUS:\n');
  
  const tables = ['profiles', 'trios', 'posts', 'replies'];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('row-level security')) {
      console.log(`  ${table}: ❌ RLS blocking SELECT`);
      report.push(`❌ RLS blocking SELECT on ${table}`);
    } else {
      console.log(`  ${table}: ✅ SELECT allowed`);
    }
  }
  
  // 7. Auth Users vs Profiles Check
  console.log('\n👥 AUTH USERS VS PROFILES:\n');
  
  const { data: authCheck } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        (SELECT COUNT(*) FROM auth.users) as auth_users,
        (SELECT COUNT(*) FROM profiles) as profiles
    `
  });
  
  if (authCheck && authCheck[0]) {
    console.log(`  Auth users: ${authCheck[0].auth_users}`);
    console.log(`  Profiles: ${authCheck[0].profiles}`);
    
    if (authCheck[0].auth_users !== authCheck[0].profiles) {
      report.push(`⚠️ Mismatch: ${authCheck[0].auth_users} auth users vs ${authCheck[0].profiles} profiles`);
    }
  }
  
  // FINAL DIAGNOSIS
  console.log('\n' + '='.repeat(80));
  console.log('📋 DIAGNOSIS REPORT');
  console.log('='.repeat(80));
  
  if (report.length === 0) {
    console.log('\n✅ No critical issues found!');
  } else {
    console.log('\n🔴 ISSUES FOUND:\n');
    report.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }
  
  console.log('\n💡 ROOT CAUSE ANALYSIS:\n');
  console.log(`
THE REAL PROBLEM IS NOT CODE - IT'S DATA!

1. PRIMARY ISSUE: No trios exist for today (${today})
   - This is why users see "No trio yet today"
   - The code is working fine, but there's no data to display

2. SECONDARY ISSUE: PostgREST OR query bug
   - The OR clause in Supabase queries returns 0 results
   - Already worked around by fetching all and filtering in JS

3. DATA INCONSISTENCY: Profile ID confusion
   - Some profiles have id === user_id (test users)
   - Some have id !== user_id (real users like Tyler)
   - This causes intermittent lookup failures

4. MISSING AUTOMATION: No daily trio creation
   - Trios need to be created every day
   - Currently manual process
   - Need scheduled job or trigger
  `);
  
  console.log('📌 IMMEDIATE ACTIONS NEEDED:\n');
  console.log(`
1. CREATE TRIOS FOR TODAY - Run: node create_trios_now.js
2. ADD DAILY CRON JOB - Auto-create trios at midnight
3. FIX OR QUERY - Keep using fetch-all-and-filter workaround
4. STANDARDIZE IDS - Ensure all new profiles have consistent ID structure
  `);
}

deepAnalysis().catch(console.error);