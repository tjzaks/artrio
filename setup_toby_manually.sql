-- Setup for Toby's account

-- 1. Add is_admin column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Make Tyler and Toby admins (when Toby signs up)
UPDATE profiles SET is_admin = true WHERE username = 'tyler';

-- 3. Create a function to make someone admin
CREATE OR REPLACE FUNCTION make_user_admin(username_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET is_admin = true 
  WHERE username = username_param;
  
  RETURN FOUND;
END;
$$;

-- 4. Check current admins
SELECT username, is_admin FROM profiles WHERE is_admin = true;