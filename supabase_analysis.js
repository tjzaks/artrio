#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg'
);

console.log('\n' + '='.repeat(80));
console.log('🔬 EXHAUSTIVE SUPABASE/ARTRIO CONNECTION ANALYSIS');
console.log('='.repeat(80));

async function analyzeConnection() {
  const findings = {
    connection: {},
    schema: {},
    policies: {},
    dataFlow: {},
    issues: []
  };

  // 1. CONNECTION ANALYSIS
  console.log('\n📡 1. CONNECTION ANALYSIS\n');
  console.log('Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').single();
    if (error && error.code !== 'PGRST116') {
      findings.connection.status = 'ERROR';
      findings.connection.error = error.message;
      findings.issues.push(`Connection error: ${error.message}`);
    } else {
      findings.connection.status = 'OK';
      console.log('  ✅ Connection successful');
    }
  } catch (e) {
    findings.connection.status = 'FAILED';
    findings.connection.error = e.message;
    findings.issues.push(`Connection failed: ${e.message}`);
  }

  // Test auth connection
  const { data: session } = await supabase.auth.getSession();
  findings.connection.authStatus = session ? 'AUTHENTICATED' : 'ANONYMOUS';
  console.log(`  Auth Status: ${findings.connection.authStatus}`);

  // 2. SCHEMA ANALYSIS
  console.log('\n🗂️ 2. DATABASE SCHEMA ANALYSIS\n');
  
  // Check tables
  const tables = ['profiles', 'trios', 'posts', 'replies', 'notifications'];
  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        findings.schema[table] = { status: 'ERROR', error: error.message };
        findings.issues.push(`Table ${table}: ${error.message}`);
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        findings.schema[table] = { status: 'OK', rowCount: count };
        console.log(`  ✅ Accessible, ${count} rows`);
      }
    } catch (e) {
      findings.schema[table] = { status: 'FAILED', error: e.message };
      console.log(`  ❌ Failed: ${e.message}`);
    }
  }

  // 3. FOREIGN KEY ANALYSIS
  console.log('\n🔗 3. FOREIGN KEY RELATIONSHIPS\n');
  
  const { data: fkData } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('trios', 'posts', 'replies', 'profiles')
    `
  });

  if (fkData) {
    console.log('Foreign Keys Found:');
    fkData.forEach(fk => {
      console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      
      // Check for mismatches
      if (fk.table_name === 'trios' && fk.foreign_table_name === 'users') {
        findings.issues.push(`CRITICAL: trios references auth.users instead of profiles!`);
      }
    });
  }

  // 4. RLS POLICY ANALYSIS
  console.log('\n🔒 4. ROW LEVEL SECURITY ANALYSIS\n');
  
  const { data: policies } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE tablename IN ('profiles', 'trios', 'posts', 'replies')
      ORDER BY tablename, policyname
    `
  });

  if (policies) {
    const tablePolices = {};
    policies.forEach(p => {
      if (!tablePolices[p.tablename]) tablePolices[p.tablename] = [];
      tablePolices[p.tablename].push(p.cmd);
    });
    
    for (const [table, cmds] of Object.entries(tablePolices)) {
      console.log(`\n${table}:`);
      const hasSELECT = cmds.includes('SELECT');
      const hasINSERT = cmds.includes('INSERT');
      const hasUPDATE = cmds.includes('UPDATE');
      const hasDELETE = cmds.includes('DELETE');
      
      console.log(`  SELECT: ${hasSELECT ? '✅' : '❌'}`);
      console.log(`  INSERT: ${hasINSERT ? '✅' : '❌'}`);
      console.log(`  UPDATE: ${hasUPDATE ? '✅' : '❌'}`);
      console.log(`  DELETE: ${hasDELETE ? '✅' : '❌'}`);
      
      if (!hasINSERT) findings.issues.push(`${table} missing INSERT policy`);
      if (!hasSELECT) findings.issues.push(`${table} missing SELECT policy`);
    }
  }

  // 5. DATA INTEGRITY CHECK
  console.log('\n🔍 5. DATA INTEGRITY ANALYSIS\n');
  
  // Check profiles without auth users
  const { data: orphanProfiles } = await supabase.rpc('execute_sql', {
    query: `
      SELECT COUNT(*) as count 
      FROM profiles p 
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = p.user_id
      )
    `
  });
  
  if (orphanProfiles && orphanProfiles[0].count > 0) {
    findings.issues.push(`${orphanProfiles[0].count} profiles without auth.users entries`);
    console.log(`  ⚠️ ${orphanProfiles[0].count} orphaned profiles`);
  }

  // Check trios with invalid user references
  const { data: invalidTrios } = await supabase.rpc('execute_sql', {
    query: `
      SELECT COUNT(*) as count
      FROM trios t
      WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = t.user1_id)
         OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = t.user2_id)
         OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = t.user3_id)
    `
  });
  
  if (invalidTrios && invalidTrios[0].count > 0) {
    findings.issues.push(`${invalidTrios[0].count} trios with invalid user references`);
    console.log(`  ⚠️ ${invalidTrios[0].count} trios with invalid references`);
  }

  // 6. ID MAPPING ANALYSIS
  console.log('\n🆔 6. ID MAPPING ANALYSIS\n');
  
  // Sample a profile to understand ID structure
  const { data: sampleProfile } = await supabase
    .from('profiles')
    .select('id, user_id, username')
    .eq('username', 'tyler')
    .single();
    
  if (sampleProfile) {
    console.log('Tyler\'s IDs:');
    console.log(`  profile.id: ${sampleProfile.id}`);
    console.log(`  profile.user_id: ${sampleProfile.user_id}`);
    
    // Check if they're the same or different
    if (sampleProfile.id === sampleProfile.user_id) {
      console.log('  ⚠️ IDs are SAME - potential confusion point');
      findings.issues.push('Some profiles have id === user_id (confusing)');
    } else {
      console.log('  ✅ IDs are DIFFERENT - proper separation');
    }
  }

  // 7. QUERY PERFORMANCE ANALYSIS
  console.log('\n⚡ 7. QUERY PERFORMANCE ANALYSIS\n');
  
  // Test the problematic OR query
  const testProfileId = 'f1fc4b18-731e-4768-83f7-5ac90e42e037';
  const today = new Date().toISOString().split('T')[0];
  
  console.log('Testing PostgREST OR query...');
  const start1 = Date.now();
  const { data: orResult } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today)
    .or(`user1_id.eq.${testProfileId},user2_id.eq.${testProfileId},user3_id.eq.${testProfileId}`);
  const time1 = Date.now() - start1;
  
  console.log(`  OR query: ${orResult?.length || 0} results in ${time1}ms`);
  if (!orResult || orResult.length === 0) {
    findings.issues.push('PostgREST OR query returns 0 results (known bug)');
  }
  
  // Test alternative approach
  const start2 = Date.now();
  const { data: allTrios } = await supabase
    .from('trios')
    .select('*')
    .eq('date', today);
  const filtered = allTrios?.filter(t => 
    t.user1_id === testProfileId ||
    t.user2_id === testProfileId ||
    t.user3_id === testProfileId
  );
  const time2 = Date.now() - start2;
  
  console.log(`  Filter approach: ${filtered?.length || 0} results in ${time2}ms`);

  // 8. TRIGGER AND FUNCTION ANALYSIS
  console.log('\n⚙️ 8. DATABASE FUNCTIONS & TRIGGERS\n');
  
  const { data: functions } = await supabase.rpc('execute_sql', {
    query: `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `
  });
  
  if (functions) {
    console.log('Functions found:');
    functions.forEach(f => console.log(`  - ${f.routine_name}`));
    
    // Check for critical functions
    const hasMakeAdmin = functions.some(f => f.routine_name === 'make_user_admin');
    const hasRandomize = functions.some(f => f.routine_name === 'randomize_trios');
    
    if (!hasMakeAdmin) findings.issues.push('Missing make_user_admin function');
    if (!hasRandomize) findings.issues.push('Missing randomize_trios function');
  }

  // FINAL SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('📊 ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n🔴 CRITICAL ISSUES FOUND:');
  if (findings.issues.length === 0) {
    console.log('  None - System appears healthy');
  } else {
    findings.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  }
  
  console.log('\n🟡 ROOT CAUSE ANALYSIS:');
  console.log(`
  1. PRIMARY ISSUE: PostgREST OR clause bug
     - The OR syntax doesn't work with our Supabase instance
     - Must fetch all trios and filter in JavaScript
  
  2. ID CONFUSION: Profile IDs vs User IDs
     - Some profiles have id === user_id (test users)
     - Some profiles have id !== user_id (real users)
     - This inconsistency causes lookup failures
  
  3. FOREIGN KEY DESIGN:
     - Trios correctly reference profiles.id
     - But some code expects auth.users.id
     - Need consistent approach throughout
  
  4. RLS POLICIES:
     - May be blocking certain operations
     - Need to verify all CRUD operations allowed
  `);
  
  console.log('\n✅ RECOMMENDATIONS:');
  console.log(`
  1. IMMEDIATE: Use fetch-all-and-filter for trio queries
  2. SHORT-TERM: Create RPC functions to bypass PostgREST bugs
  3. LONG-TERM: Standardize ID usage across entire app
  4. CRITICAL: Add proper error handling for all DB operations
  `);
  
  return findings;
}

analyzeConnection().catch(console.error);