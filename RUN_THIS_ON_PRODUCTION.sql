-- IMPORTANT: Run these migrations on the production Supabase database
-- These fix the admin dashboard and add new features

-- 1. Add unique constraint to phone_number column
ALTER TABLE profiles 
ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);

-- 2. Create function to completely delete a user account
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
  
  -- Delete from all related tables
  DELETE FROM messages WHERE sender_id = target_user_id;
  DELETE FROM conversations 
  WHERE user1_id = target_user_id OR user2_id = target_user_id;
  DELETE FROM conversation_participants WHERE user_id = target_user_id;
  DELETE FROM posts WHERE user_id = target_user_id;
  DELETE FROM replies WHERE user_id = target_user_id;
  DELETE FROM friendships 
  WHERE user_id = target_user_id OR friend_id = target_user_id;
  DELETE FROM friend_requests 
  WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM notifications 
  WHERE user_id = target_user_id OR sender_id = target_user_id;
  DELETE FROM trio_queue WHERE profile_id IN (
    SELECT id FROM profiles WHERE user_id = target_user_id
  );
  DELETE FROM stories WHERE user_id = target_user_id;
  DELETE FROM story_views WHERE viewer_id = target_user_id;
  DELETE FROM sensitive_user_data WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE user_id = target_user_id;
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

-- 3. Fix admin_get_user_email to allow admins to see other admin accounts
CREATE OR REPLACE FUNCTION admin_get_user_email(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_user_data JSON;
BEGIN
  -- Check if the calling user is an admin
  SELECT is_admin INTO v_admin_check
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF NOT v_admin_check THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;
  
  -- Admins can see all user data, including other admins
  SELECT json_build_object(
    'email', email,
    'created_at', created_at,
    'last_sign_in_at', last_sign_in_at,
    'email_confirmed_at', email_confirmed_at
  ) INTO v_user_data
  FROM auth.users
  WHERE id = target_user_id;
  
  IF v_user_data IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  
  RETURN v_user_data;
END;
$$;

-- 4. Create function to get sensitive user data for admins
CREATE OR REPLACE FUNCTION admin_get_sensitive_data(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_sensitive_data JSON;
BEGIN
  -- Check if the calling user is an admin
  SELECT is_admin INTO v_admin_check
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF NOT v_admin_check THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;
  
  -- Get sensitive data (birthday) for any user
  SELECT json_build_object(
    'birthday', birthday
  ) INTO v_sensitive_data
  FROM sensitive_user_data
  WHERE user_id = target_user_id;
  
  -- Return data or null (not an error) if not found
  RETURN COALESCE(v_sensitive_data, json_build_object('birthday', null));
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_sensitive_data(UUID) TO authenticated;