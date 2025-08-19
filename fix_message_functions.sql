-- Create the send_message function
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_message_id UUID;
  v_conversation conversations%ROWTYPE;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Validate content
  IF p_content IS NULL OR TRIM(p_content) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Message cannot be empty'
    );
  END IF;
  
  -- Check conversation exists and user has access
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
  
  -- Insert message
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, v_current_user_id, TRIM(p_content))
  RETURNING id INTO v_message_id;
  
  -- Update conversation
  UPDATE conversations
  SET 
    last_sender_id = v_current_user_id,
    awaiting_response = TRUE,
    updated_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT) TO authenticated;

-- Also create mark_messages_read function
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Mark messages as read
  UPDATE messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id != v_current_user_id
    AND is_read = FALSE;
  
  -- Reset awaiting response if needed
  UPDATE conversations
  SET awaiting_response = FALSE
  WHERE id = p_conversation_id
    AND last_sender_id != v_current_user_id
    AND awaiting_response = TRUE;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID) TO authenticated;

SELECT 'Message functions created successfully' as status;