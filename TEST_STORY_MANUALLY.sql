-- Test if we can manually insert a story to verify the database is set up correctly

-- 1. Check if the posts table has all required columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'posts'
ORDER BY ordinal_position;

-- 2. Check current posts to see structure
SELECT * FROM posts 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Try to insert a test story manually (replace YOUR_USER_ID with your actual user ID)
-- You can find your user ID by checking the profiles table
SELECT id, username FROM profiles WHERE username LIKE '%tyler%' OR username LIKE '%test%';

-- 4. Once you have your user ID, uncomment and run this:
/*
INSERT INTO posts (
  user_id,
  trio_id,
  content,
  post_type,
  media_url,
  media_type,
  image_url,
  metadata
) VALUES (
  'YOUR_USER_ID_HERE',
  NULL,
  'Test story from SQL',
  'story',
  'https://via.placeholder.com/150',
  'image',
  'https://via.placeholder.com/150',
  '{"caption_position": 50}'::jsonb
);
*/

-- 5. Check if storage bucket exists and is public
SELECT * FROM storage.buckets WHERE name = 'stories';

-- 6. Check storage policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%stories%';