-- CRITICAL: Run this to check messages data

-- 1. Are there ANY messages in the database?
SELECT COUNT(*) as total_messages FROM messages;

-- 2. Show all messages with full details
SELECT 
  m.*,
  p1.username as sender_username,
  p2.username as user1_username,  
  p3.username as user2_username
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
LEFT JOIN profiles p1 ON p1.user_id = m.sender_id
LEFT JOIN profiles p2 ON p2.user_id = c.user1_id
LEFT JOIN profiles p3 ON p3.user_id = c.user2_id
ORDER BY m.created_at DESC;

-- 3. Check if conversation_participants is populated
SELECT COUNT(*) FROM conversation_participants;

-- 4. Show which conversations have messages
SELECT 
  c.id,
  COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id;