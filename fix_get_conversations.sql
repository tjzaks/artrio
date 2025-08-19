-- Fix the get_conversations function
DROP FUNCTION IF EXISTS get_conversations();

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
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
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
    -- Check if user can send message
    CASE 
      WHEN c.last_sender_id = v_current_user_id AND COALESCE(c.awaiting_response, false) THEN FALSE
      ELSE TRUE
    END as can_send_message,
    -- Check if awaiting response
    COALESCE((c.last_sender_id = v_current_user_id AND c.awaiting_response), false) as awaiting_response
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

-- Test the function
SELECT 'get_conversations function created successfully' as status;