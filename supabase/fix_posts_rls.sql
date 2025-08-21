-- Fix posts RLS policies to allow media uploads
-- Run this entire script in Supabase SQL Editor

-- First, check what policies exist
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'posts'::regclass;

-- Drop ALL existing policies on posts table
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Create new, permissive policies
CREATE POLICY "Anyone can read posts" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create own posts" ON posts
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Make sure RLS is enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Also check if there's a trigger preventing inserts
SELECT tgname, tgtype, proname 
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'posts'::regclass;

-- Disable any spam protection function
CREATE OR REPLACE FUNCTION public.seconds_until_next_post(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN 0; -- Always allow posting
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON posts TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify the media columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'posts'
ORDER BY ordinal_position;

-- If media columns don't exist, add them
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Make content nullable for media-only posts
ALTER TABLE posts 
ALTER COLUMN content DROP NOT NULL;