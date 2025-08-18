-- Fix the get_or_create_conversation function to handle user IDs properly
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current user ID from auth
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Not logged in';
  END IF;
  
  -- Validate that we're not trying to create a conversation with ourselves
  IF v_current_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if the other user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_other_user_id) THEN
    RAISE EXCEPTION 'Target user does not exist';
  END IF;
  
  -- Check if conversation already exists (either direction)
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (user1_id = v_current_user_id AND user2_id = p_other_user_id)
     OR (user1_id = p_other_user_id AND user2_id = v_current_user_id)
  LIMIT 1;
  
  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    -- Insert with consistent ordering (smaller UUID first)
    INSERT INTO conversations (user1_id, user2_id)
    VALUES (
      LEAST(v_current_user_id, p_other_user_id),
      GREATEST(v_current_user_id, p_other_user_id)
    )
    RETURNING id INTO v_conversation_id;
    
    RAISE LOG 'Created new conversation % between users % and %', v_conversation_id, v_current_user_id, p_other_user_id;
  ELSE
    RAISE LOG 'Found existing conversation % between users % and %', v_conversation_id, v_current_user_id, p_other_user_id;
  END IF;
  
  RETURN v_conversation_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in get_or_create_conversation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improve the get_conversations function with better error handling
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
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Not logged in';
  END IF;
  
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
    COALESCE(c.is_blocked, false) as is_blocked,
    -- Check if user can send message (conversation limit logic)
    CASE 
      WHEN c.last_sender_id = v_current_user_id AND COALESCE(c.awaiting_response, false) THEN FALSE
      ELSE TRUE
    END as can_send_message,
    -- Check if awaiting response
    COALESCE((c.last_sender_id = v_current_user_id AND c.awaiting_response), false) as awaiting_response
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in get_conversations: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improve the send_message function with better validation
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_current_user_id UUID;
  v_conversation conversations%ROWTYPE;
  v_message_id UUID;
  v_other_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required: Not logged in'
    );
  END IF;
  
  -- Validate content
  IF p_content IS NULL OR TRIM(p_content) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Message content cannot be empty'
    );
  END IF;
  
  -- Validate content length
  IF LENGTH(TRIM(p_content)) > 1000 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Message too long (max 1000 characters)'
    );
  END IF;
  
  -- Get conversation details
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = p_conversation_id
    AND (user1_id = v_current_user_id OR user2_id = v_current_user_id);
  
  IF v_conversation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conversation not found or access denied'
    );
  END IF;
  
  -- Check if blocked
  IF COALESCE(v_conversation.is_blocked, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This conversation is blocked'
    );
  END IF;
  
  -- Check conversation limits (spam protection)
  IF v_conversation.last_sender_id = v_current_user_id AND COALESCE(v_conversation.awaiting_response, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must wait for a response before sending another message'
    );
  END IF;
  
  -- Insert the message
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, v_current_user_id, TRIM(p_content))
  RETURNING id INTO v_message_id;
  
  -- Update conversation state
  UPDATE conversations
  SET 
    last_sender_id = v_current_user_id,
    awaiting_response = TRUE,
    updated_at = NOW()
  WHERE id = p_conversation_id;
  
  -- If this is a response to a waiting message, reset the awaiting flag
  IF v_conversation.last_sender_id IS NOT NULL 
     AND v_conversation.last_sender_id != v_current_user_id 
     AND COALESCE(v_conversation.awaiting_response, false) THEN
    UPDATE conversations
    SET awaiting_response = FALSE
    WHERE id = p_conversation_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error sending message: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improve mark_messages_read function
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Not logged in';
  END IF;
  
  -- Verify user has access to this conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = p_conversation_id 
    AND (user1_id = v_current_user_id OR user2_id = v_current_user_id)
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;
  
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
    AND COALESCE(awaiting_response, false) = TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error marking messages as read: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;