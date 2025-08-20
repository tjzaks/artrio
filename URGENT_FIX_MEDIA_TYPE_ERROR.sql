-- URGENT FIX: Media Type Column Error in Posts Table
-- This fixes the "Could not find the 'media_type' column of 'posts' in the schema cache" error

-- Step 1: Add missing columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video'));

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_url TEXT;

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');

-- Step 2: Make content nullable (posts can be media-only)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'content' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.posts ALTER COLUMN content DROP NOT NULL;
  END IF;
END $$;

-- Step 3: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_trio_id ON public.posts(trio_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON public.posts(media_type) WHERE media_type IS NOT NULL;

-- Step 4: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Step 5: Verify all required columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'posts' 
    AND table_schema = 'public'
    AND column_name IN ('id', 'user_id', 'trio_id', 'content', 'media_type', 'media_url', 'expires_at', 'created_at')
ORDER BY column_name;

-- Step 6: Test that we can insert a post with media_type
-- This should work without errors after the fix
INSERT INTO public.posts (user_id, trio_id, content, media_type, media_url) 
VALUES (
  (SELECT auth.uid()), 
  (SELECT id FROM public.trios LIMIT 1),
  'Test post with media_type', 
  'image', 
  'test_url'
) 
ON CONFLICT DO NOTHING;

-- Clean up test data
DELETE FROM public.posts WHERE content = 'Test post with media_type';

SELECT 'Schema fix completed successfully!' as status;