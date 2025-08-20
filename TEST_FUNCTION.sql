-- Test the function directly to see if it actually works

-- 1. First, see what conversations exist
SELECT 
  id as conversation_id,
  user1_id,
  user2_id
FROM conversations 
LIMIT 3;

-- 2. Check messages in a conversation
SELECT 
  id,
  conversation_id,
  sender_id,
  content,
  is_read,
  created_at
FROM messages 
WHERE conversation_id = (SELECT id FROM conversations LIMIT 1)
ORDER BY created_at DESC;

-- 3. Test the function with a real conversation ID
-- Replace 'actual-conversation-id' with a real ID from step 1
SELECT mark_conversation_read('actual-conversation-id-here');

-- 4. Check if messages were actually updated
SELECT 
  id,
  conversation_id,
  sender_id,
  content,
  is_read,
  created_at
FROM messages 
WHERE conversation_id = 'actual-conversation-id-here'
ORDER BY created_at DESC;