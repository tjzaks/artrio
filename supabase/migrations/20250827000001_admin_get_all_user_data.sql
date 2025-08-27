-- Create comprehensive admin function to get ALL user data in one call
-- This replaces the mess of multiple functions with one clean solution

DROP FUNCTION IF EXISTS admin_get_all_user_data(UUID);

CREATE OR REPLACE FUNCTION admin_get_all_user_data(target_user_id UUID DEFAULT NULL)
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
  personality_type TEXT,
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
SET search_path = public
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

  -- Return data for specific user or all users
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::TEXT,
    COALESCE(p.phone_number, u.raw_user_meta_data->>'phone')::TEXT as phone,
    p.username::TEXT,
    (u.raw_user_meta_data->>'first_name')::TEXT as first_name,
    (u.raw_user_meta_data->>'last_name')::TEXT as last_name,
    COALESCE(
      s.birthday,
      (u.raw_user_meta_data->>'birthday')::DATE
    ) as birthday,
    CASE 
      WHEN s.birthday IS NOT NULL THEN 
        DATE_PART('year', AGE(s.birthday))::INTEGER
      WHEN u.raw_user_meta_data->>'birthday' IS NOT NULL THEN
        DATE_PART('year', AGE((u.raw_user_meta_data->>'birthday')::DATE))::INTEGER
      ELSE NULL
    END as age,
    p.bio::TEXT,
    p.avatar_url::TEXT,
    p.personality_type::TEXT,
    u.created_at,
    u.last_sign_in_at as last_sign_in,
    COALESCE(p.is_admin, false) as is_admin,
    COALESCE(p.is_banned, false) as is_banned,
    (SELECT COUNT(*) FROM posts WHERE posts.author_id = p.id)::BIGINT as total_posts,
    (SELECT COUNT(*) FROM messages WHERE messages.sender_id = u.id)::BIGINT as total_messages,
    (SELECT COUNT(*) FROM friendships f 
     WHERE (f.user_id = p.id OR f.friend_id = p.id) 
     AND f.status = 'accepted')::BIGINT / 2 as total_friends
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  LEFT JOIN sensitive_user_data s ON s.user_id = u.id
  WHERE (target_user_id IS NULL OR u.id = target_user_id)
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_all_user_data(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION admin_get_all_user_data(UUID) IS 
'Admin-only function to get complete user data. Pass NULL to get all users, or a user_id for specific user.';