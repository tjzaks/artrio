-- Enhance admin_get_user_email to include auth metadata (first_name, last_name)
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
  
  -- Admins can see all user data, including other admins and auth metadata
  SELECT json_build_object(
    'email', email,
    'created_at', created_at,
    'last_sign_in_at', last_sign_in_at,
    'email_confirmed_at', email_confirmed_at,
    'user_metadata', user_metadata,
    'raw_user_meta_data', raw_user_meta_data
  ) INTO v_user_data
  FROM auth.users
  WHERE id = target_user_id;
  
  IF v_user_data IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  
  RETURN v_user_data;
END;
$$;

-- Grant execute permission to authenticated users (admin check is done inside function)
GRANT EXECUTE ON FUNCTION admin_get_user_email(UUID) TO authenticated;

-- Update comment for documentation
COMMENT ON FUNCTION admin_get_user_email(UUID) IS 
'Admin-only function to get email, auth data, and metadata (first_name, last_name) for any user including other admins';