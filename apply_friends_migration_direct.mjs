import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use service role key for admin operations
const SUPABASE_URL = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

async function applyMigration() {
  console.log('Checking friendships table in production...');
  
  // Create admin client with service role key
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false
    }
  });

  try {
    // Test if table exists by querying it
    const { data, error } = await adminClient
      .from('friendships')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "public.friendships" does not exist')) {
        console.error('❌ Friendships table does not exist in production!');
        console.log('\n📝 MANUAL ACTION REQUIRED:');
        console.log('1. Go to: https://supabase.com/dashboard/project/siqmwgeriobtlnkxfeas/sql/new');
        console.log('2. Copy the entire contents of create_friends_system.sql');
        console.log('3. Paste it in the SQL Editor');
        console.log('4. Click "Run" to execute the migration\n');
        console.log('This will create:');
        console.log('  - friendships table');
        console.log('  - friend_requests table');
        console.log('  - RLS policies for both tables');
        console.log('  - get_friend_suggestions function');
        console.log('  - Required indexes\n');
      } else {
        console.error('Error checking table:', error.message);
      }
      return;
    }

    console.log('✅ Friendships table exists in production!');
    console.log('Table is ready to use for friend requests.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

applyMigration();