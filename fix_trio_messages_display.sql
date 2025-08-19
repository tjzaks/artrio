-- Fix for trio messages not displaying
-- The issue is that trio conversations have a different structure

-- First, let's check how trio conversations are structured
SELECT DISTINCT conversation_id, COUNT(*) 
FROM messages 
GROUP BY conversation_id 
LIMIT 10;

-- Update get_conversations to properly handle trio conversations
CREATE OR REPLACE FUNCTION get_conversations()
RETURNS TABLE (
  id UUID,
  type TEXT,  -- Add type field to distinguish DM vs trio
  other_user JSONB,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  is_blocked BOOLEAN,
  can_send_message BOOLEAN,
  awaiting_response BOOLEAN
) AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  RETURN QUERY
  -- Regular DM conversations
  SELECT 
    c.id,
    'dm'::TEXT as type,
    jsonb_build_object(
      'id', p.user_id,
      'username', p.username,
      'avatar_url', p.avatar_url
    ) as other_user,
    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
    (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != v_current_user_id AND is_read = false)::BIGINT as unread_count,
    c.is_blocked,
    -- User can send if they didn't send the last message
    (c.last_sender_id != v_current_user_id) as can_send_message,
    c.awaiting_response
  FROM conversations c
  LEFT JOIN profiles p ON p.user_id = CASE 
    WHEN c.user1_id = v_current_user_id THEN c.user2_id
    ELSE c.user1_id
  END
  WHERE c.user1_id = v_current_user_id OR c.user2_id = v_current_user_id
  
  UNION ALL
  
  -- Trio conversations
  SELECT 
    t.id,
    'trio'::TEXT as type,
    jsonb_build_object(
      'id', t.id::TEXT,
      'username', 'Trio Chat',
      'avatar_url', NULL
    ) as other_user,
    (SELECT content FROM messages WHERE conversation_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
    (SELECT created_at FROM messages WHERE conversation_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
    0::BIGINT as unread_count,  -- Trios don't track unread for now
    false as is_blocked,
    true as can_send_message,  -- Always can send in trio
    false as awaiting_response
  FROM trios t
  JOIN trio_members tm ON tm.trio_id = t.id
  WHERE tm.user_id = v_current_user_id
    AND t.ends_at > NOW()  -- Only active trios
  
  ORDER BY last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure messages in trios use the trio_id as conversation_id
-- This might need to be checked in your send_message function

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_conversations() TO authenticated;