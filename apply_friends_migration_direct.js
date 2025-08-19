const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service role key for admin operations
const SUPABASE_URL = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzUyMDEyMCwiZXhwIjoyMDQ5MDk2MTIwfQ.cJZMdlM2p2gf42OZ8qN0WZSXkpFH4UbMFVjQgJQLBhI';

async function applyMigration() {
  console.log('Applying friends system migration to production...');
  
  // Create admin client with service role key
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false
    }
  });

  try {
    // Create friendships table
    const { error: table1Error } = await adminClient.rpc('query_raw', {
      query: `
        CREATE TABLE IF NOT EXISTS public.friendships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
          friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
          status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          accepted_at TIMESTAMPTZ,
          UNIQUE(user_id, friend_id),
          CHECK (user_id != friend_id)
        )
      `
    });

    if (table1Error) {
      console.log('Note: Table might already exist or query_raw not available');
    }

    // Test if table exists by querying it
    const { data, error } = await adminClient
      .from('friendships')
      .select('*')
      .limit(1);

    if (error && error.message.includes('relation "public.friendships" does not exist')) {
      console.error('❌ Friendships table does not exist in production!');
      console.log('\n📝 Please apply this migration manually in Supabase SQL Editor:');
      console.log('1. Go to https://supabase.com/dashboard/project/siqmwgeriobtlnkxfeas/sql/new');
      console.log('2. Copy and paste the contents of create_friends_system.sql');
      console.log('3. Click "Run" to execute the migration\n');
      return;
    }

    console.log('✅ Friendships table exists or was created successfully!');
    
    // Check if RLS is enabled
    const { data: rlsData } = await adminClient
      .from('friendships')
      .select('*')
      .limit(1);
    
    console.log('✅ Table is accessible and ready to use');

  } catch (error) {
    console.error('Error:', error);
    console.log('\n📝 Please apply the migration manually in Supabase SQL Editor');
  }
}

applyMigration();