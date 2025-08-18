const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Setting up randomize_trios function in local database...');
console.log('📍 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupRandomizeFunction() {
  try {
    // First, we need to use the Supabase SQL editor or direct connection
    // Since we can't execute raw SQL through the client easily, let's check current state
    
    console.log('📋 Checking current database state...');
    
    // Test if we can query the trios table
    const { data: trios, error: triosError } = await supabase
      .from('trios')
      .select('*')
      .limit(1);
    
    if (triosError) {
      console.error('❌ Error checking trios table:', triosError);
    } else {
      console.log('✅ Trios table exists');
    }
    
    // Since we can't directly create SQL functions via the JS client,
    // we'll provide instructions for manual setup
    console.log('\n' + '='.repeat(60));
    console.log('📝 MANUAL SETUP REQUIRED:');
    console.log('='.repeat(60));
    console.log('\n1. Open Supabase Studio: http://127.0.0.1:54323');
    console.log('2. Go to the SQL Editor');
    console.log('3. Copy and paste the contents of: create_randomize_function.sql');
    console.log('4. Click "Run" to execute the SQL');
    console.log('\nThe SQL file has been created at:');
    console.log('   /Users/tyler/Library/CloudStorage/Dropbox/artrio/create_randomize_function.sql');
    console.log('\n' + '='.repeat(60));
    
    // Alternative: Try to check if function exists
    const { data: funcCheck, error: funcError } = await supabase
      .rpc('randomize_trios');
    
    if (funcError && funcError.message.includes('Could not find')) {
      console.log('\n⚠️  The randomize_trios function does not exist yet.');
      console.log('   Please follow the manual setup instructions above.');
    } else if (!funcError) {
      console.log('\n✅ The randomize_trios function already exists!');
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

setupRandomizeFunction();