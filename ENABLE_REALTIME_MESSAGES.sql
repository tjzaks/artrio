-- Enable realtime for the messages table
-- This is required for real-time updates to work

-- Check if realtime is enabled for messages table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'messages';

-- Enable realtime on the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Also enable for conversations table for updates
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Verify realtime is enabled
SELECT 
  schemaname,
  tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Note: After running this, messages should appear in real-time without refreshing