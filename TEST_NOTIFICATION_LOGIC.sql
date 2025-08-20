-- Test the EXACT query our notification hook uses
-- Your user ID: 5e2cc902-3728-4abb-bfcd-80a37c39a10b

-- Step 1: Get your conversations (EXACTLY as the hook does)
WITH my_conversations AS (
  SELECT id 
  FROM conversations 
  WHERE user1_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b' 
     OR user2_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b'
)
SELECT 'Your conversations:' as info, COUNT(*) as count FROM my_conversations;

-- Step 2: Show the conversations
SELECT * FROM conversations 
WHERE user1_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b' 
   OR user2_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b';

-- Step 3: Count unread using EXACT same logic as our hook
WITH my_conversations AS (
  SELECT id 
  FROM conversations 
  WHERE user1_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b' 
     OR user2_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b'
)
SELECT 
  'Unread count:' as info,
  COUNT(*) as count
FROM messages 
WHERE conversation_id IN (SELECT id FROM my_conversations)
  AND is_read = false
  AND sender_id != '5e2cc902-3728-4abb-bfcd-80a37c39a10b';

-- Step 4: Show the actual "unread" messages if any
WITH my_conversations AS (
  SELECT id 
  FROM conversations 
  WHERE user1_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b' 
     OR user2_id = '5e2cc902-3728-4abb-bfcd-80a37c39a10b'
)
SELECT 
  m.*,
  p.username as sender_username
FROM messages m
LEFT JOIN profiles p ON p.user_id = m.sender_id
WHERE m.conversation_id IN (SELECT id FROM my_conversations)
  AND m.is_read = false
  AND m.sender_id != '5e2cc902-3728-4abb-bfcd-80a37c39a10b'
ORDER BY m.created_at DESC;