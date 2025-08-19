-- Check unread messages for a specific user
-- Replace USER_ID_HERE with the actual user ID you want to check

-- First, let's see all conversations and their unread counts
WITH user_conversations AS (
  SELECT 
    c.id as conversation_id,
    c.user1_id,
    c.user2_id,
    CASE 
      WHEN c.user1_id = auth.uid() THEN c.user2_id 
      ELSE c.user1_id 
    END as other_user_id
  FROM conversations c
  WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
),
unread_counts AS (
  SELECT 
    m.conversation_id,
    COUNT(*) as unread_count,
    array_agg(
      json_build_object(
        'id', m.id,
        'content', LEFT(m.content, 50),
        'sender_id', m.sender_id,
        'created_at', m.created_at,
        'is_read', m.is_read
      ) ORDER BY m.created_at DESC
    ) as unread_messages
  FROM messages m
  INNER JOIN user_conversations uc ON m.conversation_id = uc.conversation_id
  WHERE 
    m.is_read = false 
    AND m.sender_id != auth.uid()
  GROUP BY m.conversation_id
)
SELECT 
  uc.conversation_id,
  uc.other_user_id,
  p.username as other_username,
  COALESCE(ur.unread_count, 0) as unread_count,
  ur.unread_messages
FROM user_conversations uc
LEFT JOIN unread_counts ur ON uc.conversation_id = ur.conversation_id
LEFT JOIN profiles p ON p.id = uc.other_user_id
ORDER BY COALESCE(ur.unread_count, 0) DESC;

-- Total unread count (what should appear in the badge)
SELECT 
  COUNT(*) as total_unread_messages
FROM messages m
INNER JOIN conversations c ON m.conversation_id = c.id
WHERE 
  (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  AND m.is_read = false 
  AND m.sender_id != auth.uid();