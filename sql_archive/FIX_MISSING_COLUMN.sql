-- Add the missing image_url column to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name IN ('image_url', 'media_url', 'media_type', 'post_type')
ORDER BY column_name;