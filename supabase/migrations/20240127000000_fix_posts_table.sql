-- Add missing media columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IN ('image', 'video'));

-- Make content nullable since posts can be media-only
ALTER TABLE public.posts 
ALTER COLUMN content DROP NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_posts_trio_id ON public.posts(trio_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);