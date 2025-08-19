-- Create storage buckets for Artrio
-- This fixes the "Bucket not found" error when uploading profile photos

-- Create avatars bucket for profile photos
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit)
VALUES (
  'avatars', 
  'avatars', 
  true,  -- Public bucket so avatars can be viewed by anyone
  false, 
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  5242880  -- 5MB limit
) ON CONFLICT (id) DO NOTHING;

-- Create stories bucket for story images/videos
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit)
VALUES (
  'stories', 
  'stories', 
  true,  -- Public bucket for stories
  false,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'],
  52428800  -- 50MB limit for videos
) ON CONFLICT (id) DO NOTHING;

-- Create posts bucket for post media
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit)
VALUES (
  'posts', 
  'posts', 
  true,  -- Public bucket for posts
  false,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  10485760  -- 10MB limit
) ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Set up RLS policies for stories bucket
CREATE POLICY "Anyone can view stories" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own stories" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own stories" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stories' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Set up RLS policies for posts bucket
CREATE POLICY "Anyone can view posts" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload their own posts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own posts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );