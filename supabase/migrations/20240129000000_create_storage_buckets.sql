-- Create storage buckets for stories and media

-- Create stories bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- Create messages bucket for DM media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages',
  'messages',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for stories bucket
CREATE POLICY "Users can upload their own stories" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view stories" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can delete their own stories" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stories' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policies for messages bucket
CREATE POLICY "Users can upload message media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'messages' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view message media" ON storage.objects
  FOR SELECT USING (bucket_id = 'messages');

CREATE POLICY "Users can delete their own message media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'messages' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );