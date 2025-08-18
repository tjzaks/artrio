-- Create function to get email from username for login
CREATE OR REPLACE FUNCTION get_email_from_username(input_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email from auth.users via profiles
  SELECT au.email INTO user_email
  FROM profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.username = input_username
  LIMIT 1;
  
  RETURN user_email;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_email_from_username TO anon;
GRANT EXECUTE ON FUNCTION get_email_from_username TO authenticated;

-- Test it
SELECT get_email_from_username('tyler') as tyler_email;
SELECT get_email_from_username('Jonny B') as jonny_email;