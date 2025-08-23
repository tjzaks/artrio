-- Check what storage buckets exist in your Supabase project
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- Check if there are any objects in the stories bucket (if it exists)
SELECT 
  COUNT(*) as total_files,
  bucket_id
FROM storage.objects
GROUP BY bucket_id;

-- Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;