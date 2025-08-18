-- Run this in Supabase SQL Editor to automatically grant admin to tobyszaks when they sign up

-- First, check if tobyszaks exists
SELECT id, username, is_admin, created_at 
FROM profiles 
WHERE username = 'tobyszaks' OR username ILIKE '%toby%';

-- If the user exists, grant admin
UPDATE profiles 
SET is_admin = true
WHERE username = 'tobyszaks' OR username = 'toby';

-- Create a trigger to auto-grant admin to tobyszaks when they sign up
CREATE OR REPLACE FUNCTION auto_grant_admin_to_toby()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the new user is tobyszaks or toby
  IF NEW.username = 'tobyszaks' OR NEW.username = 'toby' THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_admin_for_toby ON profiles;
CREATE TRIGGER auto_admin_for_toby
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_admin_to_toby();

-- Also make tyler an admin if not already
UPDATE profiles 
SET is_admin = true
WHERE username = 'tyler';

-- Check who has admin
SELECT username, is_admin, created_at 
FROM profiles 
WHERE is_admin = true;