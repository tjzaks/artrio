-- Drop the old function if it exists
DROP FUNCTION IF EXISTS admin_get_all_user_data(UUID);

-- Create a simpler version that should work
CREATE OR REPLACE FUNCTION admin_get_all_user_data()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  phone TEXT,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  birthday DATE,
  age INTEGER,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in TIMESTAMPTZ,
  is_admin BOOLEAN,
  is_banned BOOLEAN,
  total_posts BIGINT,
  total_messages BIGINT,
  total_friends BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Return all user data
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::TEXT,
    COALESCE(p.phone_number, u.phone)::TEXT as phone,
    p.username::TEXT,
    u.raw_user_meta_data->>'first_name' as first_name,
    u.raw_user_meta_data->>'last_name' as last_name,
    CASE 
      WHEN u.raw_user_meta_data->>'birthday' IS NOT NULL 
      THEN (u.raw_user_meta_data->>'birthday')::DATE
      ELSE NULL
    END as birthday,
    CASE 
      WHEN u.raw_user_meta_data->>'birthday' IS NOT NULL 
      THEN DATE_PART('year', AGE((u.raw_user_meta_data->>'birthday')::DATE))::INTEGER
      ELSE NULL
    END as age,
    p.bio::TEXT,
    p.avatar_url::TEXT,
    u.created_at,
    u.last_sign_in_at as last_sign_in,
    COALESCE(p.is_admin, false) as is_admin,
    COALESCE(p.is_banned, false) as is_banned,
    0::BIGINT as total_posts,  -- Simplified for now
    0::BIGINT as total_messages,  -- Simplified for now
    0::BIGINT as total_friends  -- Simplified for now
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_all_user_data() TO authenticated;

-- Test it quickly (run this in SQL editor to verify)
-- SELECT * FROM admin_get_all_user_data();