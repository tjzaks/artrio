-- Fix notification issues by cleaning up message read status

-- 1. First, set all messages to read=true by default
UPDATE messages 
SET is_read = true 
WHERE is_read IS NULL;

-- 2. Mark only recent unread messages as unread (last 7 days)
-- This ensures we don't have old stale unread messages
UPDATE messages 
SET is_read = false 
WHERE created_at > NOW() - INTERVAL '7 days'
  AND is_read = false;

-- 3. Create a function to properly mark messages as read when viewed
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_conversation_id UUID,
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to get accurate unread count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE (c.user1_id = p_user_id OR c.user2_id = p_user_id)
    AND m.sender_id != p_user_id
    AND m.is_read = false;
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add a trigger to ensure new messages start as unread
CREATE OR REPLACE FUNCTION set_message_unread_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- New messages should be unread by default
  IF NEW.is_read IS NULL THEN
    NEW.is_read = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_message_unread_on_insert ON messages;
CREATE TRIGGER ensure_message_unread_on_insert
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_unread_on_insert();

-- 6. Clean up any orphaned messages (messages without valid conversations)
DELETE FROM messages
WHERE conversation_id NOT IN (SELECT id FROM conversations);

-- 7. Verify the fix by checking current unread counts
-- Replace 'YOUR_USER_ID' with actual user ID to test
-- SELECT get_unread_message_count('YOUR_USER_ID'::uuid) as unread_count;