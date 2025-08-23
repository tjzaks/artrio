-- BULLETPROOF FIX: Make stories work independently of trios
-- This is a proper architectural fix, not a patch

-- 1. Make trio_id nullable in posts table (stories don't require trios)
ALTER TABLE posts 
ALTER COLUMN trio_id DROP NOT NULL;

-- 2. Add index for efficient story queries
CREATE INDEX IF NOT EXISTS idx_posts_story_queries 
ON posts(user_id, post_type, created_at DESC) 
WHERE post_type = 'story';

-- 3. Create a proper view for story visibility logic
CREATE OR REPLACE VIEW story_visibility AS
SELECT DISTINCT
  p.id as post_id,
  p.user_id as author_id,
  viewer.id as viewer_id,
  CASE 
    -- Author can always see their own stories
    WHEN p.user_id = viewer.id THEN true
    -- Friends can always see stories
    WHEN EXISTS (
      SELECT 1 FROM friendships f 
      WHERE f.status = 'accepted' 
      AND ((f.user_id = p.user_id AND f.friend_id = viewer.id) 
        OR (f.friend_id = p.user_id AND f.user_id = viewer.id))
    ) THEN true
    -- Current trio members (today only) can see stories
    WHEN p.trio_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM trios t 
      WHERE t.id = p.trio_id 
      AND t.date = CURRENT_DATE
      AND (t.user1_id = viewer.id OR t.user2_id = viewer.id OR t.user3_id = viewer.id)
    ) THEN true
    ELSE false
  END as can_view
FROM posts p
CROSS JOIN profiles viewer
WHERE p.post_type = 'story'
  AND p.created_at > NOW() - INTERVAL '24 hours';

-- 4. Update RLS policy to use proper visibility logic
DROP POLICY IF EXISTS "View stories" ON posts;

CREATE POLICY "View stories" ON posts
FOR SELECT USING (
  post_type != 'story' OR 
  EXISTS (
    SELECT 1 FROM story_visibility sv
    WHERE sv.post_id = posts.id
    AND sv.viewer_id = auth.uid()
    AND sv.can_view = true
  )
);

-- 5. Ensure posts can be created without trio_id
DROP POLICY IF EXISTS "Create posts" ON posts;

CREATE POLICY "Create posts" ON posts
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- 6. Add constraint to ensure regular posts have trio_id but stories don't require it
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_trio_requirement;

ALTER TABLE posts ADD CONSTRAINT check_trio_requirement 
CHECK (
  (post_type = 'story') OR 
  (post_type != 'story' AND trio_id IS NOT NULL)
);

-- 7. Create function to clean up expired stories (24 hour lifecycle)
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM posts 
  WHERE post_type = 'story' 
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add metadata column if it doesn't exist (for caption positioning etc)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE posts ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- 9. Verify the fix
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Test that we can insert a story without trio_id
  INSERT INTO posts (
    id, 
    user_id, 
    content, 
    post_type,
    media_url,
    media_type,
    metadata
  ) VALUES (
    gen_random_uuid(),
    auth.uid(),
    'Test story',
    'story',
    'https://test.com/image.jpg',
    'image',
    '{"caption_position": 50}'::jsonb
  ) RETURNING id IS NOT NULL INTO test_result;
  
  IF NOT test_result THEN
    RAISE EXCEPTION 'Story creation test failed';
  END IF;
  
  -- Clean up test
  DELETE FROM posts WHERE content = 'Test story' AND post_type = 'story';
  
  RAISE NOTICE 'Story independence fix applied successfully!';
END $$;