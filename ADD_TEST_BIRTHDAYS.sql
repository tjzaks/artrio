-- This script adds test birthdays for existing users
-- Run this in your Supabase SQL editor

-- First, let's see which users exist
SELECT 
  p.username,
  p.user_id,
  sd.birthday,
  CASE 
    WHEN sd.birthday IS NOT NULL THEN 'Has birthday'
    ELSE 'Missing birthday'
  END as status
FROM profiles p
LEFT JOIN sensitive_user_data sd ON sd.user_id = p.user_id
ORDER BY p.created_at DESC;

-- Update birthdays for specific users (you can modify these)
-- Replace the user_ids with actual ones from your database

-- Example: Set Toby's birthday (replace with actual user_id)
UPDATE sensitive_user_data 
SET birthday = '2000-03-15'
WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'toby' LIMIT 1);

-- Example: Set another user's birthday
UPDATE sensitive_user_data 
SET birthday = '1995-07-22'
WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'marcher' LIMIT 1);

-- Verify the updates
SELECT 
  p.username,
  sd.birthday,
  DATE_PART('year', AGE(sd.birthday))::INTEGER as age
FROM profiles p
JOIN sensitive_user_data sd ON sd.user_id = p.user_id
WHERE sd.birthday IS NOT NULL;

-- Test the admin function with a specific user
-- Replace with an actual user_id
-- SELECT admin_get_sensitive_data('7bb22480-1d1a-4d91-af1d-af008290af53');