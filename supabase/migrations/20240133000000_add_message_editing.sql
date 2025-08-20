-- Add missing columns to messages table that the UI expects

-- Add edited_at column for message editing functionality
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add edit_message function that the UI uses
CREATE OR REPLACE FUNCTION edit_message(
  p_message_id UUID,
  p_user_id UUID,
  p_new_content TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message messages%ROWTYPE;
BEGIN
  -- Get the message and verify ownership
  SELECT * INTO v_message
  FROM messages
  WHERE id = p_message_id AND sender_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Message not found or you do not have permission to edit it'
    );
  END IF;
  
  -- Update the message
  UPDATE messages
  SET content = p_new_content,
      edited_at = NOW()
  WHERE id = p_message_id;
  
  RETURN json_build_object(
    'success', true,
    'message_id', p_message_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION edit_message(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_message(UUID, UUID, TEXT) TO service_role;