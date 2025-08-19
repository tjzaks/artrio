-- Fix admin_get_user_email to allow admins to see other admin accounts
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

-- Also create a function to get sensitive user data for admins
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
GRANT EXECUTE ON FUNCTION admin_get_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_sensitive_data(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION admin_get_user_email(UUID) IS 
'Admin-only function to get email and auth data for any user including other admins';

COMMENT ON FUNCTION admin_get_sensitive_data(UUID) IS 
'Admin-only function to get sensitive data (birthday) for any user';