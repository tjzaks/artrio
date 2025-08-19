-- Add unique constraint to phone_number column
ALTER TABLE profiles 
ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);

-- Create function to completely delete a user account
CREATE OR REPLACE FUNCTION admin_delete_user_account(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_user_email TEXT;
  v_result JSON;
BEGIN
  -- Check if the calling user is an admin
  SELECT is_admin INTO v_admin_check
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF NOT v_admin_check THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Get user email before deletion (for auth deletion)
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = target_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Delete from all related tables (cascade should handle most, but being explicit)
  
  -- Delete messages
  DELETE FROM messages WHERE sender_id = target_user_id;
  
  -- Delete from conversations
  DELETE FROM conversations 
  WHERE user1_id = target_user_id OR user2_id = target_user_id;
  
  -- Delete from conversation_participants
  DELETE FROM conversation_participants WHERE user_id = target_user_id;
  
  -- Delete posts
  DELETE FROM posts WHERE user_id = target_user_id;
  
  -- Delete replies
  DELETE FROM replies WHERE user_id = target_user_id;
  
  -- Delete friendships
  DELETE FROM friendships 
  WHERE user_id = target_user_id OR friend_id = target_user_id;
  
  -- Delete friend requests
  DELETE FROM friend_requests 
  WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  
  -- Delete notifications
  DELETE FROM notifications 
  WHERE user_id = target_user_id OR sender_id = target_user_id;
  
  -- Delete from trio_queue
  DELETE FROM trio_queue WHERE profile_id IN (
    SELECT id FROM profiles WHERE user_id = target_user_id
  );
  
  -- Delete stories
  DELETE FROM stories WHERE user_id = target_user_id;
  
  -- Delete story views
  DELETE FROM story_views WHERE viewer_id = target_user_id;
  
  -- Delete from sensitive_user_data
  DELETE FROM sensitive_user_data WHERE user_id = target_user_id;
  
  -- Delete from profiles (this should be last before auth)
  DELETE FROM profiles WHERE user_id = target_user_id;
  
  -- Delete from auth.users (this removes the user from Supabase Auth)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'User account deleted successfully',
    'deleted_email', v_user_email
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (admin check is in function)
GRANT EXECUTE ON FUNCTION admin_delete_user_account(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION admin_delete_user_account(UUID) IS 
'Admin-only function to completely delete a user account including all related data and auth record';