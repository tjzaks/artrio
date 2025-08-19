-- RUN THIS SQL IN YOUR PRODUCTION SUPABASE DASHBOARD
-- This fixes the admin dashboard account info viewing

-- 1. Drop the old function if it exists
DROP FUNCTION IF EXISTS admin_get_user_email(UUID);
DROP FUNCTION IF EXISTS get_user_email_for_admin(UUID);

-- 2. Create the new admin_get_user_email function that works for ALL users
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
  
  IF v_admin_check IS NOT TRUE THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;
  
  -- Get user data from auth.users table
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

-- 3. Create function to get sensitive data (birthday) for admins
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
  
  IF v_admin_check IS NOT TRUE THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;
  
  -- Get sensitive data
  SELECT json_build_object(
    'birthday', birthday
  ) INTO v_sensitive_data
  FROM sensitive_user_data
  WHERE user_id = target_user_id;
  
  -- Return data or null if not found
  RETURN COALESCE(v_sensitive_data, json_build_object('birthday', null));
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION admin_get_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_sensitive_data(UUID) TO authenticated;

-- 5. Test the functions (optional - will show results for testing)
-- SELECT admin_get_user_email('7bb22480-1d1a-4d91-af1d-af008290af53'); -- Replace with a real user ID