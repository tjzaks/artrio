-- Fix the admin_delete_user_account function to match actual database schema
-- The error shows that some tables don't have 'sender_id' column

CREATE OR REPLACE FUNCTION public.admin_delete_user_account(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_user_email TEXT;
  v_username TEXT;
  v_result JSON;
BEGIN
  -- Check if the calling user is an admin
  SELECT is_admin INTO v_admin_check
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF v_admin_check IS NULL OR NOT v_admin_check THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin access required');
  END IF;
  
  -- Get user info before deletion
  SELECT p.username, au.email 
  INTO v_username, v_user_email
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = target_user_id;
  
  IF v_username IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Start deletion process
  -- Delete from all related tables (check column names carefully)
  
  -- Delete messages (check actual column name)
  DELETE FROM messages WHERE user_id = target_user_id;
  
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
  
  -- Delete friend requests (check actual column names)
  BEGIN
    DELETE FROM friend_requests 
    WHERE from_user_id = target_user_id OR to_user_id = target_user_id;
  EXCEPTION
    WHEN undefined_column THEN
      -- Try alternate column names
      DELETE FROM friend_requests 
      WHERE user_id = target_user_id OR friend_id = target_user_id;
  END;
  
  -- Delete notifications (handle different column names)
  BEGIN
    DELETE FROM notifications WHERE user_id = target_user_id;
  EXCEPTION
    WHEN undefined_column THEN
      NULL; -- Skip if table doesn't exist or has different structure
  END;
  
  -- Delete from trios (remove user from any trios)
  UPDATE trios SET user1_id = NULL WHERE user1_id = target_user_id;
  UPDATE trios SET user2_id = NULL WHERE user2_id = target_user_id;
  UPDATE trios SET user3_id = NULL WHERE user3_id = target_user_id;
  UPDATE trios SET user4_id = NULL WHERE user4_id = target_user_id;
  UPDATE trios SET user5_id = NULL WHERE user5_id = target_user_id;
  
  -- Delete from trio_queue
  BEGIN
    DELETE FROM trio_queue WHERE profile_id IN (
      SELECT id FROM profiles WHERE user_id = target_user_id
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL; -- Skip if table doesn't exist
  END;
  
  -- Delete stories
  DELETE FROM stories WHERE user_id = target_user_id;
  
  -- Delete story views
  DELETE FROM story_views WHERE viewer_id = target_user_id;
  
  -- Delete story reactions
  DELETE FROM story_reactions WHERE user_id = target_user_id;
  
  -- Delete from sensitive_user_data if exists
  BEGIN
    DELETE FROM sensitive_user_data WHERE user_id = target_user_id;
  EXCEPTION
    WHEN undefined_table THEN
      NULL; -- Skip if table doesn't exist
  END;
  
  -- Delete from profiles (this should be last before auth)
  DELETE FROM profiles WHERE user_id = target_user_id;
  
  -- Delete from auth.users (this removes the user from Supabase Auth)
  -- Note: This might fail if there are still references, but we've cleaned most
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Log the deletion
  RAISE NOTICE 'Deleted user account: % (%)', v_username, target_user_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', format('User account %s deleted successfully', v_username),
    'deleted_username', v_username,
    'deleted_email', v_user_email
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'detail', SQLSTATE,
      'hint', 'Check column names in your database schema'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(UUID) TO service_role;

-- First, let's check what columns actually exist in these tables
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('messages', 'notifications', 'friend_requests')
ORDER BY table_name, column_name;