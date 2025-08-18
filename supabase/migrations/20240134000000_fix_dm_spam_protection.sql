-- Fix DM spam protection to maintain 1-message limit pattern
-- This ensures users can only send one message at a time, waiting for a response each time

-- Drop and recreate the send_message function with proper spam protection
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
  
  -- Determine the other user
  IF v_conversation.user1_id = v_current_user_id THEN
    v_other_user_id := v_conversation.user2_id;
  ELSE
    v_other_user_id := v_conversation.user1_id;
  END IF;
  
  -- Check if blocked
  IF v_conversation.is_blocked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This conversation is blocked'
    );
  END IF;
  
  -- STRICT SPAM PROTECTION: Check if user already sent the last message
  -- This maintains the alternating pattern indefinitely
  IF v_conversation.last_sender_id = v_current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must wait for a response before sending another message'
    );
  END IF;
  
  -- Insert the message
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, v_current_user_id, p_content)
  RETURNING id INTO v_message_id;
  
  -- Update conversation state - ALWAYS set awaiting_response to TRUE
  -- This ensures the pattern continues
  UPDATE conversations
  SET 
    last_sender_id = v_current_user_id,
    awaiting_response = TRUE,  -- Always true after sending
    updated_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_conversations function to properly show who can send next
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
    -- User can send if they weren't the last sender
    c.last_sender_id != v_current_user_id as can_send_message,
    -- They're awaiting response if they were the last sender
    c.last_sender_id = v_current_user_id as awaiting_response
  FROM conversations c
  LEFT JOIN profiles p ON (
    CASE 
      WHEN c.user1_id = v_current_user_id THEN c.user2_id
      ELSE c.user1_id
    END = p.user_id
  )
  LEFT JOIN LATERAL (
    SELECT 
      msg.content as last_message,
      msg.created_at as last_message_at,
      COUNT(*) FILTER (WHERE msg2.is_read = false AND msg2.sender_id != v_current_user_id) as unread_count
    FROM messages msg
    LEFT JOIN messages msg2 ON msg2.conversation_id = c.id
    WHERE msg.conversation_id = c.id
    GROUP BY msg.id, msg.content, msg.created_at
    ORDER BY msg.created_at DESC
    LIMIT 1
  ) m ON true
  WHERE c.user1_id = v_current_user_id OR c.user2_id = v_current_user_id
  ORDER BY COALESCE(m.last_message_at, c.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a helper function to check if a user can send a message
CREATE OR REPLACE FUNCTION can_send_dm(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_user_id UUID;
  v_last_sender_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  SELECT last_sender_id INTO v_last_sender_id
  FROM conversations
  WHERE id = p_conversation_id
    AND (user1_id = v_current_user_id OR user2_id = v_current_user_id);
  
  -- User can send if they weren't the last sender (or if no messages yet)
  RETURN v_last_sender_id IS NULL OR v_last_sender_id != v_current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;