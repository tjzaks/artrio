-- Simple function to mark messages as read
-- Step by step approach

-- First, let's see what's in the messages table
SELECT 
  id, 
  conversation_id, 
  sender_id, 
  is_read,
  created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;

-- Create the simplest possible function
CREATE OR REPLACE FUNCTION mark_conversation_read(conv_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE messages 
  SET is_read = true 
  WHERE conversation_id = conv_id 
    AND is_read = false 
    AND sender_id != auth.uid();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'updated_count', updated_count
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO service_role;

-- Test it exists
SELECT proname FROM pg_proc WHERE proname = 'mark_conversation_read';