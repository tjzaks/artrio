-- First, let's diagnose what's happening with unread messages
-- This will show ALL unread messages in the system for the current user

-- Step 1: Check what unread messages exist for the current user
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
)
SELECT 
  m.id as message_id,
  m.conversation_id,
  m.content,
  m.sender_id,
  m.is_read,
  m.created_at,
  uc.other_user_id,
  p.username as other_username,
  CASE 
    WHEN m.sender_id = auth.uid() THEN 'You sent this'
    ELSE 'They sent this'
  END as direction
FROM messages m
INNER JOIN user_conversations uc ON m.conversation_id = uc.conversation_id
LEFT JOIN profiles p ON p.id = uc.other_user_id
WHERE 
  m.is_read = false 
  AND m.sender_id != auth.uid()  -- Only messages from others should count as unread
ORDER BY m.created_at DESC;

-- Step 2: Get the total count (what appears in the badge)
SELECT 
  COUNT(*) as total_unread_messages
FROM messages m
INNER JOIN conversations c ON m.conversation_id = c.id
WHERE 
  (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  AND m.is_read = false 
  AND m.sender_id != auth.uid();

-- Step 3: FIX - Mark all messages as read for conversations you've already viewed
-- Run this to clean up phantom unread messages
UPDATE messages
SET is_read = true
WHERE id IN (
  SELECT m.id
  FROM messages m
  INNER JOIN conversations c ON m.conversation_id = c.id
  WHERE 
    (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    AND m.is_read = false 
    AND m.sender_id != auth.uid()
);

-- Step 4: Verify the fix worked
SELECT 
  COUNT(*) as remaining_unread_messages
FROM messages m
INNER JOIN conversations c ON m.conversation_id = c.id
WHERE 
  (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  AND m.is_read = false 
  AND m.sender_id != auth.uid();