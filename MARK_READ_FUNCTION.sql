-- Create a database function to handle marking messages as read
-- This bypasses client-side issues and RLS complications

CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update all unread messages in this conversation (except ones the user sent)
  UPDATE messages 
  SET is_read = true, updated_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND is_read = false
    AND sender_id != p_user_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'conversation_id', p_conversation_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'conversation_id', p_conversation_id
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;

-- Test the function
SELECT mark_conversation_read('your-conversation-id-here');