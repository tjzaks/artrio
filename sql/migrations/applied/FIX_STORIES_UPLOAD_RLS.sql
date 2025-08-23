-- CRITICAL FIX: Stories upload failing with RLS policy violation
-- Run this IMMEDIATELY in Supabase SQL Editor to fix TestFlight bug

-- 1. First check if stories table exists and its current policies
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM pg_policy WHERE polrelid = (schemaname||'.'||tablename)::regclass) as policy_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
FROM pg_tables 
WHERE tablename = 'stories';

-- 2. Check current stories policies
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'stories'::regclass;

-- 3. Drop ALL existing policies on stories table
DROP POLICY IF EXISTS "Anyone can read stories" ON stories;
DROP POLICY IF EXISTS "Users can create stories" ON stories;
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;

-- 4. Create simple, permissive policies
CREATE POLICY "Anyone can read stories" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Users can create own stories" ON stories
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON stories
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 5. Make sure RLS is enabled
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- 6. Grant permissions
GRANT ALL ON stories TO authenticated;
GRANT ALL ON stories TO anon;

-- 7. Check stories table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'stories'
ORDER BY ordinal_position;

-- 8. Ensure necessary columns exist
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS trio_id UUID REFERENCES trios(id) ON DELETE CASCADE;

-- 9. Make content nullable for media-only stories
ALTER TABLE stories 
ALTER COLUMN content DROP NOT NULL;

-- 10. Check if there's a posts/stories insert trigger causing issues
SELECT 
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  p.proname as function_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('posts', 'stories')
ORDER BY c.relname, t.tgname;

-- 11. Also fix posts table while we're at it (the error might be from posts, not stories)
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can create own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

CREATE POLICY "Anyone can read posts" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create own posts" ON posts
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE 
  USING (auth.uid() = user_id);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON posts TO authenticated;

-- 12. Ensure posts has necessary columns
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS trio_id UUID REFERENCES trios(id) ON DELETE CASCADE;

ALTER TABLE posts 
ALTER COLUMN content DROP NOT NULL;

-- 13. Check storage bucket policies too (photos might be failing here)
SELECT 
  id as bucket_id,
  name as bucket_name,
  public,
  created_at
FROM storage.buckets
WHERE name IN ('avatars', 'posts', 'stories', 'photos');

-- 14. Create missing buckets if needed
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('posts', 'posts', true),
  ('stories', 'stories', true),
  ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 15. Fix storage policies
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own" ON storage.objects;

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view" ON storage.objects
  FOR SELECT USING (true);

CREATE POLICY "Users can delete own" ON storage.objects
  FOR DELETE USING (auth.uid()::text = owner);

-- 16. Final verification
SELECT 
  'Stories table policies:' as check_type,
  COUNT(*) as count 
FROM pg_policy 
WHERE polrelid = 'stories'::regclass
UNION ALL
SELECT 
  'Posts table policies:' as check_type,
  COUNT(*) as count 
FROM pg_policy 
WHERE polrelid = 'posts'::regclass
UNION ALL
SELECT 
  'Storage buckets:' as check_type,
  COUNT(*) as count 
FROM storage.buckets
WHERE name IN ('avatars', 'posts', 'stories', 'photos');