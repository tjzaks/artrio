-- Add message editing capability
-- Simple: just add edited_at column to track if/when a message was edited

ALTER TABLE messages 
ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create a simple function to update message content
CREATE OR REPLACE FUNCTION edit_message(
  p_message_id UUID,
  p_user_id UUID,
  p_new_content TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Only allow editing your own messages
  UPDATE messages 
  SET 
    content = p_new_content,
    edited_at = NOW()
  WHERE 
    id = p_message_id 
    AND sender_id = p_user_id;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION edit_message(UUID, UUID, TEXT) TO authenticated;