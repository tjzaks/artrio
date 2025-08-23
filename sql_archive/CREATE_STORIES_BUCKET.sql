-- Create the stories storage bucket if it doesn't exist
-- Run this in Supabase SQL editor

-- Create stories bucket with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories', 
  true, -- Public access for stories
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- Create RLS policies for the stories bucket
CREATE POLICY "Users can upload stories" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'stories' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view stories" ON storage.objects
FOR SELECT 
USING (bucket_id = 'stories');

CREATE POLICY "Users can delete own stories" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'stories' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'stories';