-- Add media columns to posts table
-- Run this in Supabase SQL Editor RIGHT NOW

-- Add the missing media columns
ALTER TABLE posts 
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video') OR media_type IS NULL);

-- Make content nullable since posts can be media-only
ALTER TABLE posts 
ALTER COLUMN content DROP NOT NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'posts'
ORDER BY ordinal_position;

-- Update RLS policies to be permissive
DROP POLICY IF EXISTS "Users can create posts" ON posts;

CREATE POLICY "Users can create posts" ON posts
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Disable rate limiting
CREATE OR REPLACE FUNCTION public.seconds_until_next_post(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;