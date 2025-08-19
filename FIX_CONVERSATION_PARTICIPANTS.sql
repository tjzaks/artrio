-- FIX: Populate conversation_participants table
-- This is why messages aren't showing - the participants table is empty!

-- First, check existing conversations
SELECT id, user1_id, user2_id FROM conversations;

-- Populate conversation_participants for all existing conversations
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT id, user1_id FROM conversations
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants 
  WHERE conversation_id = conversations.id 
  AND user_id = conversations.user1_id
)
UNION ALL
SELECT id, user2_id FROM conversations
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants 
  WHERE conversation_id = conversations.id 
  AND user_id = conversations.user2_id
);

-- Verify the fix
SELECT COUNT(*) as participant_count FROM conversation_participants;

-- Now fix the get_conversations function to not require auth context
-- (or at least handle missing participants gracefully)
CREATE OR REPLACE FUNCTION get_conversations()
RETURNS TABLE (
  id UUID,
  type TEXT,
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
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
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
    (c.last_sender_id IS NULL OR c.last_sender_id != v_current_user_id) as can_send_message,
    c.awaiting_response
  FROM conversations c
  LEFT JOIN profiles p ON p.user_id = CASE 
    WHEN c.user1_id = v_current_user_id THEN c.user2_id
    ELSE c.user1_id
  END
  WHERE (c.user1_id = v_current_user_id OR c.user2_id = v_current_user_id)
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = c.id
      AND cp.user_id = v_current_user_id
    )
  ORDER BY last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_conversations() TO authenticated;