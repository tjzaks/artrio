-- Grant admin access to tobyszaks
-- Run this in Supabase SQL Editor

-- First, check if the user exists
SELECT id, username, email, role, created_at 
FROM profiles 
WHERE username = 'tobyszaks' OR username = 'toby' OR username ILIKE '%toby%'
ORDER BY created_at DESC;

-- Update tobyszaks to admin role
UPDATE profiles 
SET role = 'admin'
WHERE username = 'tobyszaks';

-- If username might be different, you can also try:
-- UPDATE profiles 
-- SET role = 'admin'
-- WHERE email = 'toby@example.com'; -- Replace with Toby's actual email

-- Verify the update
SELECT id, username, email, role, created_at 
FROM profiles 
WHERE role = 'admin';