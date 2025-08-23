-- Fix storage policies for the stories bucket

-- First, drop any existing policies for the stories bucket
DROP POLICY IF EXISTS "Users can upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own stories" ON storage.objects;

-- Create proper RLS policies for the stories bucket
CREATE POLICY "Anyone can upload stories 1h1s0ji_0" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'stories' AND 
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view stories 1h1s0ji_1" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'stories');

CREATE POLICY "Users can update own stories 1h1s0ji_2" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stories' AND 
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own stories 1h1s0ji_3" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stories' AND 
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
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