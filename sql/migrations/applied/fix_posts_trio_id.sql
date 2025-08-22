-- Fix posts table to allow stories without trio_id
-- Stories are posted without a trio context

-- Make trio_id nullable for stories
ALTER TABLE public.posts 
ALTER COLUMN trio_id DROP NOT NULL;

-- Add post_type column to distinguish between regular posts and stories
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'post' CHECK (post_type IN ('post', 'story'));

-- Add image_url for backward compatibility with stories
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS image_url text;

-- Add metadata column for story-specific data like caption position
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Update the RLS policy to allow story posts without trio_id
DROP POLICY IF EXISTS "Users can create posts with rate limit" ON public.posts;

CREATE POLICY "Users can create posts with rate limit" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    public.can_user_post(auth.uid()) AND
    (
      -- Regular posts must have trio_id
      (post_type = 'post' AND trio_id IS NOT NULL) OR
      -- Stories don't need trio_id
      (post_type = 'story' AND trio_id IS NULL)
    )
  );

-- Update view policy to allow viewing stories
DROP POLICY IF EXISTS "Trio members can view posts" ON public.posts;

CREATE POLICY "Users can view posts" ON public.posts
  FOR SELECT USING (
    -- View own posts
    auth.uid() = user_id OR
    -- View trio posts if member
    (
      trio_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.trios
        WHERE trios.id = posts.trio_id
        AND (
          auth.uid() = trios.user1_id OR 
          auth.uid() = trios.user2_id OR 
          auth.uid() = trios.user3_id OR
          auth.uid() = trios.user4_id OR
          auth.uid() = trios.user5_id
        )
      )
    ) OR
    -- View stories from trio members
    (
      post_type = 'story' AND
      EXISTS (
        SELECT 1 FROM public.trios t
        WHERE t.date = CURRENT_DATE
        AND (
          (auth.uid() IN (t.user1_id, t.user2_id, t.user3_id, t.user4_id, t.user5_id)) AND
          (posts.user_id IN (t.user1_id, t.user2_id, t.user3_id, t.user4_id, t.user5_id))
        )
      )
    )
  );

-- Add index for post_type
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);