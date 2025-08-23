-- Fix the posts table schema to support stories properly

-- 1. First add post_type column if it doesn't exist
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'post';

-- 2. Add media_url and media_type columns if they don't exist
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_url TEXT;

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 3. Add metadata column for story-specific data
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 4. Now make trio_id nullable (stories don't need trios)
ALTER TABLE posts 
ALTER COLUMN trio_id DROP NOT NULL;

-- 5. Update existing posts to have correct post_type
UPDATE posts 
SET post_type = 'post' 
WHERE post_type IS NULL;

-- 6. Add index for efficient story queries
CREATE INDEX IF NOT EXISTS idx_posts_story_queries 
ON posts(user_id, post_type, created_at DESC);

-- 7. Update RLS policies for stories
DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view posts" ON posts;
CREATE POLICY "Users can view posts" ON posts
FOR SELECT USING (
  -- Can always see your own posts
  auth.uid() = user_id
  OR
  -- Can see posts from your trio
  trio_id IN (
    SELECT id FROM trios 
    WHERE user1_id = auth.uid() 
       OR user2_id = auth.uid() 
       OR user3_id = auth.uid()
  )
  OR
  -- Can see stories from friends
  (post_type = 'story' AND EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
    AND ((f.user_id = posts.user_id AND f.friend_id = auth.uid())
      OR (f.friend_id = posts.user_id AND f.user_id = auth.uid()))
  ))
  OR
  -- Can see stories from current trio members (today only)
  (post_type = 'story' AND EXISTS (
    SELECT 1 FROM trios t
    WHERE t.date = CURRENT_DATE
    AND posts.user_id IN (t.user1_id, t.user2_id, t.user3_id)
    AND auth.uid() IN (t.user1_id, t.user2_id, t.user3_id)
  ))
);

-- 8. Verify the schema is correct
DO $$
BEGIN
  -- Check all required columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'post_type') THEN
    RAISE EXCEPTION 'post_type column missing';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_url') THEN
    RAISE EXCEPTION 'media_url column missing';
  END IF;
  
  RAISE NOTICE 'Schema updated successfully! Stories can now be posted without trios.';
END $$;