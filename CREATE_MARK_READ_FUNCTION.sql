-- Create the mark_conversation_read function
-- This will bypass any RLS issues and work reliably

DROP FUNCTION IF EXISTS mark_conversation_read(UUID, UUID);
DROP FUNCTION IF EXISTS mark_conversation_read(UUID);

CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Attempting to mark conversation % as read for user %', p_conversation_id, p_user_id;
  
  -- Update all unread messages in this conversation (except ones the user sent)
  UPDATE messages 
  SET is_read = true
  WHERE conversation_id = p_conversation_id
    AND is_read = false
    AND sender_id != p_user_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Updated % messages to read status', v_updated_count;
  
  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'conversation_id', p_conversation_id,
    'user_id', p_user_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in mark_conversation_read: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'conversation_id', p_conversation_id,
      'user_id', p_user_id
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO service_role;

-- Also create the single parameter version
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.mark_conversation_read(p_conversation_id, auth.uid());
END;
$$;

-- Grant permissions for single parameter version
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO service_role;

-- Test that the function exists
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'mark_conversation_read'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');