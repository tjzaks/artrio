-- Update send_message function to allow admins to bypass restrictions
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
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Check if user is admin
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM profiles
  WHERE user_id = v_current_user_id;
  
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
  
  -- Check spam protection (skip for admins)
  IF NOT v_is_admin THEN
    -- Only apply restriction if not an admin
    IF v_conversation.last_sender_id = v_current_user_id 
       AND COALESCE(v_conversation.awaiting_response, false) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'You must wait for a response before sending another message'
      );
    END IF;
  END IF;
  
  -- Insert message
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, v_current_user_id, TRIM(p_content))
  RETURNING id INTO v_message_id;
  
  -- Update conversation
  -- For admins, don't set awaiting_response to restrict the other user
  UPDATE conversations
  SET 
    last_sender_id = v_current_user_id,
    awaiting_response = CASE 
      WHEN v_is_admin THEN FALSE  -- Admins don't trigger waiting restriction
      ELSE TRUE
    END,
    updated_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'is_admin', v_is_admin
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

-- Also update get_conversations to show admin bypass
CREATE OR REPLACE FUNCTION public.get_conversations()
RETURNS TABLE (
  id UUID,
  other_user JSONB,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  is_blocked BOOLEAN,
  can_send_message BOOLEAN,
  awaiting_response BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if current user is admin
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM profiles
  WHERE user_id = v_current_user_id;
  
  RETURN QUERY
  SELECT 
    c.id,
    jsonb_build_object(
      'id', CASE 
        WHEN c.user1_id = v_current_user_id THEN c.user2_id
        ELSE c.user1_id
      END,
      'username', p.username,
      'avatar_url', p.avatar_url
    ) as other_user,
    m.last_message,
    m.last_message_at,
    COALESCE(m.unread_count, 0) as unread_count,
    COALESCE(c.is_blocked, false) as is_blocked,
    -- Admins can always send messages
    CASE 
      WHEN v_is_admin THEN TRUE
      WHEN c.last_sender_id = v_current_user_id AND COALESCE(c.awaiting_response, false) THEN FALSE
      ELSE TRUE
    END as can_send_message,
    -- Check if awaiting response (admins bypass this)
    CASE
      WHEN v_is_admin THEN FALSE
      ELSE COALESCE((c.last_sender_id = v_current_user_id AND c.awaiting_response), false)
    END as awaiting_response
  FROM conversations c
  JOIN auth.users u ON (
    CASE 
      WHEN c.user1_id = v_current_user_id THEN c.user2_id
      ELSE c.user1_id
    END = u.id
  )
  LEFT JOIN profiles p ON p.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT 
      content as last_message,
      created_at as last_message_at,
      COUNT(*) FILTER (WHERE NOT is_read AND sender_id != v_current_user_id) as unread_count
    FROM messages
    WHERE conversation_id = c.id
    GROUP BY content, created_at
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  WHERE c.user1_id = v_current_user_id OR c.user2_id = v_current_user_id
  ORDER BY COALESCE(m.last_message_at, c.created_at) DESC;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error getting conversations: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_conversations() TO authenticated;

SELECT 'Admin message bypass added successfully' as status;