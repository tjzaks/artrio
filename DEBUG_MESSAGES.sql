-- Debug: Check message read status for current user
-- Replace USER_ID with your actual user ID

-- 1. Check all conversations for the user
SELECT 
    c.id as conversation_id,
    c.user1_id,
    c.user2_id,
    CASE 
        WHEN c.user1_id = 'USER_ID' THEN c.user2_id
        ELSE c.user1_id
    END as other_user_id
FROM conversations c
WHERE c.user1_id = 'USER_ID' OR c.user2_id = 'USER_ID';

-- 2. Check all messages in user's conversations with read status
SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.is_read,
    m.created_at,
    LEFT(m.content, 50) as content_preview,
    CASE 
        WHEN m.sender_id = 'USER_ID' THEN 'sent'
        ELSE 'received'
    END as message_type
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE (c.user1_id = 'USER_ID' OR c.user2_id = 'USER_ID')
ORDER BY m.created_at DESC
LIMIT 20;

-- 3. Count unread messages that SHOULD show as notifications
-- (messages not sent by the user and marked as unread)
SELECT 
    COUNT(*) as unread_count,
    m.conversation_id
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE (c.user1_id = 'USER_ID' OR c.user2_id = 'USER_ID')
    AND m.sender_id != 'USER_ID'  -- Not sent by the user
    AND m.is_read = false          -- Marked as unread
GROUP BY m.conversation_id;

-- 4. Total unread count (what should show in badge)
SELECT COUNT(*) as total_unread
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE (c.user1_id = 'USER_ID' OR c.user2_id = 'USER_ID')
    AND m.sender_id != 'USER_ID'
    AND m.is_read = false;

-- 5. Check if there are any messages with NULL is_read values
SELECT COUNT(*) as null_read_status_count
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE (c.user1_id = 'USER_ID' OR c.user2_id = 'USER_ID')
    AND m.is_read IS NULL;

-- 6. Check for any orphaned messages (no valid conversation)
SELECT COUNT(*) as orphaned_messages
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
WHERE c.id IS NULL;