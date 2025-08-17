-- COMPLETE AUTHENTICATION SETUP
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- 1. USERNAME LOGIN FUNCTION
-- ============================================

-- Function to get email from username for login
CREATE OR REPLACE FUNCTION get_email_from_username(input_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email from auth.users via profiles (case-insensitive)
  SELECT au.email INTO user_email
  FROM profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE LOWER(p.username) = LOWER(input_username)
  LIMIT 1;
  
  RETURN user_email;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_email_from_username TO anon;
GRANT EXECUTE ON FUNCTION get_email_from_username TO authenticated;

-- ============================================
-- 2. CASE-INSENSITIVE USERNAMES
-- ============================================

-- Update existing usernames to lowercase
UPDATE profiles 
SET username = LOWER(username)
WHERE username != LOWER(username);

-- Drop existing constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Create unique index on lowercase username
DROP INDEX IF EXISTS profiles_username_ci_unique;
CREATE UNIQUE INDEX profiles_username_ci_unique 
ON profiles (LOWER(username));

-- Create trigger to automatically lowercase usernames
CREATE OR REPLACE FUNCTION lowercase_username()
RETURNS TRIGGER AS $$
BEGIN
  NEW.username = LOWER(NEW.username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_lowercase_username ON profiles;

-- Create trigger for insert and update
CREATE TRIGGER ensure_lowercase_username
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION lowercase_username();

-- Update the handle_new_user function to use lowercase
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    LOWER(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. TEST THE SETUP
-- ============================================

-- Test username login function
SELECT get_email_from_username('tyler') as tyler_email;
SELECT get_email_from_username('dev') as dev_email;
SELECT get_email_from_username('jonny b') as jonny_email;

-- Show all usernames (should all be lowercase now)
SELECT username, is_admin FROM profiles ORDER BY username;

-- ============================================
-- 4. GET DEV USER PASSWORD
-- ============================================

-- Check dev user details
SELECT 
  p.username,
  au.email,
  'Password: Check if you set one, or reset it' as password_note
FROM profiles p
JOIN auth.users au ON au.id = p.user_id
WHERE p.username = 'dev';