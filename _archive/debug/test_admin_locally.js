#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please ensure .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminFunctions() {
  console.log('\n🔍 Testing Admin Functions...\n');

  // Test 1: Check if functions exist
  console.log('1️⃣ Testing randomize_trios function...');
  try {
    const { data, error } = await supabase.rpc('randomize_trios');
    
    if (error) {
      console.error('❌ Error calling randomize_trios:', error.message);
      console.error('Details:', error);
    } else if (data) {
      console.log('✅ randomize_trios response:', JSON.stringify(data, null, 2));
      
      if (data.success === false) {
        console.log('⚠️ Function executed but returned error:', data.error);
      } else if (data.success === true) {
        console.log('🎉 Successfully created trios!');
        console.log(`   - Trios created: ${data.trios_created}`);
        console.log(`   - Users assigned: ${data.users_assigned}`);
        console.log(`   - Total users: ${data.total_users}`);
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }

  // Test 2: Check delete function
  console.log('\n2️⃣ Testing delete_todays_trios function...');
  try {
    const { data, error } = await supabase.rpc('delete_todays_trios');
    
    if (error) {
      console.error('❌ Error calling delete_todays_trios:', error.message);
    } else if (data) {
      console.log('✅ delete_todays_trios response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }

  // Test 3: Check cleanup function
  console.log('\n3️⃣ Testing cleanup_expired_content function...');
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_content');
    
    if (error) {
      console.error('❌ Error calling cleanup_expired_content:', error.message);
    } else if (data) {
      console.log('✅ cleanup_expired_content response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }

  // Test 4: Check profiles
  console.log('\n4️⃣ Checking profiles table...');
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error checking profiles:', error.message);
    } else {
      console.log(`✅ Total profiles in database: ${count}`);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }

  // Test 5: Check admin status
  console.log('\n5️⃣ Checking admin users...');
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'admin');
    
    if (error) {
      console.error('❌ Error checking admin users:', error.message);
    } else {
      console.log(`✅ Total admin users: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log('Admin user IDs:', data.map(u => u.user_id).join(', '));
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run tests
testAdminFunctions().then(() => {
  console.log('\n✅ Tests complete!');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});