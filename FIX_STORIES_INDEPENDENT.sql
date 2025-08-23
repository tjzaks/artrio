-- Make stories independent of trios
-- Stories should be visible to friends AND trio members

-- 1. Make trio_id nullable in posts table
ALTER TABLE posts 
ALTER COLUMN trio_id DROP NOT NULL;

-- 2. Update RLS policies to allow story viewing by friends
DROP POLICY IF EXISTS "Users can view trio posts" ON posts;

CREATE POLICY "Users can view posts" ON posts
FOR SELECT
TO authenticated
USING (
  -- Can see your own posts
  user_id = auth.uid()
  OR
  -- Can see posts from your current trio (if in one)
  (
    trio_id IS NOT NULL AND
    trio_id IN (
      SELECT id FROM trios 
      WHERE date = CURRENT_DATE
      AND (user1_id = auth.uid() OR user2_id = auth.uid() OR user3_id = auth.uid())
    )
  )
  OR
  -- Can see stories from friends
  (
    post_type = 'story' AND
    user_id IN (
      SELECT 
        CASE 
          WHEN user1_id = auth.uid() THEN user2_id
          ELSE user1_id
        END as friend_id
      FROM friendships
      WHERE status = 'accepted'
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  )
  OR
  -- Can see stories from anyone you've ever been in a trio with
  (
    post_type = 'story' AND
    user_id IN (
      SELECT DISTINCT 
        CASE 
          WHEN user1_id = auth.uid() THEN user2_id
          WHEN user2_id = auth.uid() THEN 
            CASE WHEN user1_id != auth.uid() THEN user1_id ELSE user3_id END
          ELSE user1_id
        END as trio_member
      FROM trios
      WHERE user1_id = auth.uid() OR user2_id = auth.uid() OR user3_id = auth.uid()
      UNION
      SELECT DISTINCT
        CASE 
          WHEN user1_id = auth.uid() THEN user3_id
          WHEN user3_id = auth.uid() THEN 
            CASE WHEN user1_id != auth.uid() THEN user1_id ELSE user2_id END
          ELSE user3_id
        END as trio_member
      FROM trios
      WHERE user1_id = auth.uid() OR user2_id = auth.uid() OR user3_id = auth.uid()
    )
  )
);

-- 3. Ensure users can create posts without trio_id
DROP POLICY IF EXISTS "Users can create trio posts" ON posts;

CREATE POLICY "Users can create posts" ON posts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  (
    -- Regular trio posts need trio_id
    (post_type != 'story' AND trio_id IS NOT NULL)
    OR
    -- Stories don't need trio_id
    post_type = 'story'
  )
);

-- 4. Update the posts table to reflect this change
COMMENT ON COLUMN posts.trio_id IS 'Optional - required for trio posts, null for stories';

-- 5. Create an index for better story query performance
CREATE INDEX IF NOT EXISTS idx_posts_story_user ON posts(user_id, post_type) 
WHERE post_type = 'story';

-- 6. Create a function to get visible stories (from friends and ALL trio members - past and present)
CREATE OR REPLACE FUNCTION get_visible_stories(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.user_id,
    p.content,
    p.media_url,
    p.created_at,
    pr.username,
    pr.avatar_url
  FROM posts p
  JOIN profiles pr ON pr.user_id = p.user_id
  WHERE 
    p.post_type = 'story'
    AND p.created_at > NOW() - INTERVAL '24 hours'  -- Stories expire after 24h
    AND (
      -- Own stories
      p.user_id = p_user_id
      OR
      -- Stories from friends
      p.user_id IN (
        SELECT 
          CASE 
            WHEN f.user1_id = p_user_id THEN f.user2_id
            ELSE f.user1_id
          END
        FROM friendships f
        WHERE f.status = 'accepted'
        AND (f.user1_id = p_user_id OR f.user2_id = p_user_id)
      )
      OR
      -- Stories from ANY trio members (past or present)
      p.user_id IN (
        SELECT DISTINCT other_user
        FROM (
          -- Get all users who have ever been in a trio with you
          SELECT user1_id as other_user FROM trios WHERE user2_id = p_user_id OR user3_id = p_user_id
          UNION
          SELECT user2_id as other_user FROM trios WHERE user1_id = p_user_id OR user3_id = p_user_id
          UNION
          SELECT user3_id as other_user FROM trios WHERE user1_id = p_user_id OR user2_id = p_user_id
        ) trio_connections
        WHERE other_user != p_user_id
      )
    )
  ORDER BY p.created_at DESC;
END;
$$;