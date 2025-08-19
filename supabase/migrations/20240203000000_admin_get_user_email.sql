-- Create function to allow admins to get user email
CREATE OR REPLACE FUNCTION get_user_email_for_admin(target_user_id UUID)
RETURNS TABLE (
  email TEXT,
  last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Return email and last sign in for the target user
  RETURN QUERY
  SELECT 
    au.email::TEXT,
    au.last_sign_in_at
  FROM auth.users au
  WHERE au.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email_for_admin TO authenticated;