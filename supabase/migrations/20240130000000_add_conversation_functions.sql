-- Create RPC functions for conversation management

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_current_user_id UUID;
  v_other_auth_id UUID;
BEGIN
  -- Get current user ID from auth
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get the auth user ID for the other user (in case we're passed a profile ID)
  -- First check if it's already an auth user ID
  SELECT id INTO v_other_auth_id FROM auth.users WHERE id = p_other_user_id;
  
  -- If not found, check if it's a profile ID and get the corresponding auth user ID
  IF v_other_auth_id IS NULL THEN
    SELECT user_id INTO v_other_auth_id FROM profiles WHERE id = p_other_user_id;
  END IF;
  
  -- If still not found, try to get it from profiles by user_id
  IF v_other_auth_id IS NULL THEN
    SELECT user_id INTO v_other_auth_id FROM profiles WHERE user_id = p_other_user_id;
    IF v_other_auth_id IS NULL THEN
      v_other_auth_id := p_other_user_id;
    END IF;
  END IF;
  
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (user1_id = v_current_user_id AND user2_id = v_other_auth_id)
     OR (user1_id = v_other_auth_id AND user2_id = v_current_user_id)
  LIMIT 1;
  
  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (user1_id, user2_id)
    VALUES (
      LEAST(v_current_user_id, v_other_auth_id),
      GREATEST(v_current_user_id, v_other_auth_id)
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating conversation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all conversations for the current user
CREATE OR REPLACE FUNCTION get_conversations()
RETURNS TABLE (
  id UUID,
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
  SELECT 
    c.id,
    jsonb_build_object(
      'id', p.user_id,
      'username', p.username,
      'avatar_url', p.avatar_url
    ) as other_user,
    m.last_message,
    m.last_message_at,
    COALESCE(m.unread_count, 0) as unread_count,
    c.is_blocked,
    -- Check if user can send message (conversation limit logic)
    CASE 
      WHEN c.last_sender_id = v_current_user_id AND c.awaiting_response THEN FALSE
      ELSE TRUE
    END as can_send_message,
    -- Check if awaiting response
    (c.last_sender_id = v_current_user_id AND c.awaiting_response) as awaiting_response
  FROM conversations c
  JOIN profiles p ON (
    CASE 
      WHEN c.user1_id = v_current_user_id THEN c.user2_id
      ELSE c.user1_id
    END = p.user_id
  )
  LEFT JOIN LATERAL (
    SELECT 
      content as last_message,
      created_at as last_message_at,
      COUNT(*) FILTER (WHERE NOT is_read AND sender_id != v_current_user_id) as unread_count
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  WHERE c.user1_id = v_current_user_id OR c.user2_id = v_current_user_id
  ORDER BY COALESCE(m.last_message_at, c.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_current_user_id UUID;
  v_conversation conversations%ROWTYPE;
  v_message_id UUID;
  v_can_send BOOLEAN;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Get conversation details
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = p_conversation_id
    AND (user1_id = v_current_user_id OR user2_id = v_current_user_id);
  
  IF v_conversation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conversation not found'
    );
  END IF;
  
  -- Check if blocked
  IF v_conversation.is_blocked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This conversation is blocked'
    );
  END IF;
  
  -- Check conversation limits (spam protection)
  IF v_conversation.last_sender_id = v_current_user_id AND v_conversation.awaiting_response THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must wait for a response before sending another message'
    );
  END IF;
  
  -- Insert the message
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, v_current_user_id, p_content)
  RETURNING id INTO v_message_id;
  
  -- Update conversation state
  UPDATE conversations
  SET 
    last_sender_id = v_current_user_id,
    awaiting_response = TRUE,
    updated_at = NOW()
  WHERE id = p_conversation_id;
  
  -- If this is a response to a waiting message, reset the awaiting flag
  IF v_conversation.last_sender_id != v_current_user_id AND v_conversation.awaiting_response THEN
    UPDATE conversations
    SET awaiting_response = FALSE
    WHERE id = p_conversation_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  UPDATE messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id != v_current_user_id
    AND is_read = FALSE;
    
  -- Also reset awaiting_response if the current user is responding
  UPDATE conversations
  SET awaiting_response = FALSE
  WHERE id = p_conversation_id
    AND last_sender_id != v_current_user_id
    AND awaiting_response = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read TO authenticated;