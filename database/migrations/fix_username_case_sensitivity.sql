-- FIX USERNAME CASE SENSITIVITY
-- Make all usernames case-insensitive throughout the system

-- 1. First, update any existing usernames to lowercase
UPDATE profiles 
SET username = LOWER(username);

-- 2. Add a unique constraint on LOWER(username) to prevent case variations
-- Drop existing constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Create new unique index on lowercase username
CREATE UNIQUE INDEX profiles_username_ci_unique 
ON profiles (LOWER(username));

-- 3. Update the username check function to be case-insensitive
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

-- 4. Create a trigger to automatically lowercase usernames on insert/update
CREATE OR REPLACE FUNCTION lowercase_username()
RETURNS TRIGGER AS $$
BEGIN
  NEW.username = LOWER(NEW.username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_lowercase_username ON profiles;

-- Create trigger for insert
CREATE TRIGGER ensure_lowercase_username
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION lowercase_username();

-- 5. Update the handle_new_user function to use lowercase
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

-- Test the changes
SELECT username, LOWER(username) as lowercase_username FROM profiles;

-- Verify uniqueness works
-- This should fail if "tyler" already exists:
-- INSERT INTO profiles (user_id, username) VALUES (gen_random_uuid(), 'TYLER');