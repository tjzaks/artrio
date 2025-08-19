const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function applyFriendsMigration() {
  console.log('Applying friends system migration to production...');
  
  // Execute the SQL commands
  const sqlCommands = `
    -- Create friendships table for friend connections
    CREATE TABLE IF NOT EXISTS public.friendships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      UNIQUE(user_id, friend_id),
      CHECK (user_id != friend_id)
    );

    -- Create friend_requests table (for easier tracking)
    CREATE TABLE IF NOT EXISTS public.friend_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      UNIQUE(from_user_id, to_user_id),
      CHECK (from_user_id != to_user_id)
    );

    -- Enable RLS
    ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
  `;

  try {
    // This is just to check connection
    const { data, error } = await supabase.from('profiles').select('count(*)').single();
    
    if (error) {
      console.error('Connection error:', error);
      return;
    }
    
    console.log('Connected to production database successfully');
    console.log('Note: You need to apply the SQL migration manually in Supabase Dashboard SQL Editor');
    console.log('The migration file is: create_friends_system.sql');
  } catch (error) {
    console.error('Error:', error);
  }
}

applyFriendsMigration();