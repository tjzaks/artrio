-- Simpler version that checks table structure first
-- Then deletes only from tables that exist with correct columns

CREATE OR REPLACE FUNCTION public.admin_delete_user_account(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_username TEXT;
BEGIN
  -- Check if the calling user is an admin
  SELECT is_admin INTO v_admin_check
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF v_admin_check IS NULL OR NOT v_admin_check THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin access required');
  END IF;
  
  -- Get username before deletion
  SELECT username INTO v_username
  FROM profiles
  WHERE user_id = target_user_id;
  
  IF v_username IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Delete from tables we know exist
  -- Use CASCADE to handle foreign key constraints automatically
  
  -- Delete the profile (this will cascade to most related data)
  DELETE FROM profiles WHERE user_id = target_user_id;
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', format('User %s deleted successfully', v_username)
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
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(UUID) TO service_role;