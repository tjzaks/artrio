-- Check if real-time is enabled for the messages table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'messages';

-- Check current publication configuration
SELECT * FROM pg_publication_tables 
WHERE tablename = 'messages';

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

-- Create publication with all events enabled
CREATE PUBLICATION supabase_realtime FOR TABLE messages 
WITH (publish = 'insert, update, delete');

-- Enable real-time for the messages table (Supabase specific)
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Verify it's enabled
SELECT * FROM pg_publication_tables 
WHERE tablename = 'messages';

-- Also check if RLS is blocking updates
SELECT * FROM pg_policies 
WHERE tablename = 'messages';