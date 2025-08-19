-- Insert test messages to verify the messaging system works

-- First, get the conversation IDs and user IDs
SELECT id, user1_id, user2_id FROM conversations;

-- Insert test messages for the first conversation
-- REPLACE the conversation_id and sender_ids with actual values from above query
INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
VALUES 
  -- Replace these UUIDs with actual values from your conversations table
  ('YOUR_CONVERSATION_ID_HERE', 'USER1_ID_HERE', 'Hey! How are you?', false, NOW() - INTERVAL '5 minutes'),
  ('YOUR_CONVERSATION_ID_HERE', 'USER2_ID_HERE', 'I''m good! Just testing the app', false, NOW() - INTERVAL '4 minutes'),
  ('YOUR_CONVERSATION_ID_HERE', 'USER1_ID_HERE', 'Same here, looks pretty cool', false, NOW() - INTERVAL '3 minutes'),
  ('YOUR_CONVERSATION_ID_HERE', 'USER2_ID_HERE', 'Yeah the trio feature is interesting', false, NOW() - INTERVAL '2 minutes'),
  ('YOUR_CONVERSATION_ID_HERE', 'USER1_ID_HERE', 'Can''t wait to try it out!', false, NOW() - INTERVAL '1 minute');

-- After inserting, verify they exist
SELECT * FROM messages ORDER BY created_at DESC;