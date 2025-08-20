-- Check ALL unread messages for user @tzak
-- Your user ID: 5e2cc902-3728-4abb-bfcd-80a37c39a10b

-- 1. Get your conversations
WITH my_conversations AS (
  SELECT id 
  FROM conversations 
  WHERE user1_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b' 
     OR user2_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b'
)
-- 2. Count unread messages you RECEIVED (not sent)
SELECT 
  COUNT(*) as unread_count,
  array_agg(id) as message_ids
FROM messages 
WHERE conversation_id IN (SELECT id FROM my_conversations)
  AND is_read = false
  AND sender_id != '5e2cc902-3728-4abb-bfcd-80a37c39a10b';

-- 3. Show the actual unread messages if any exist
SELECT 
  m.id,
  m.content,
  m.sender_id,
  m.is_read,
  m.created_at,
  p.username as sender_username
FROM messages m
LEFT JOIN profiles p ON p.user_id = m.sender_id
WHERE m.conversation_id IN (
  SELECT id FROM conversations 
  WHERE user1_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b' 
     OR user2_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b'
)
AND m.is_read = false
AND m.sender_id != '5e2cc902-3728-4abb-bfcd-80a37c39a10b'
ORDER BY m.created_at DESC;