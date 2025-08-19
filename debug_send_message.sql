-- Debug and test the send_message function
-- First, let's check if the function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'send_message';

-- Check the conversations table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'conversations'
ORDER BY ordinal_position;

-- Check the messages table structure  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Test creating a simple message directly (replace with actual IDs)
-- This will help us see what's failing
/*
INSERT INTO messages (conversation_id, sender_id, content)
VALUES (
    'YOUR_CONVERSATION_ID', 
    auth.uid(), 
    'Test message'
);
*/