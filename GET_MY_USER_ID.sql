-- Get your user ID from your email
-- Replace 'your-email@example.com' with your actual email address

SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE email = 'your-email@example.com';

-- Or if you know your username, use this:
-- SELECT 
--     user_id,
--     username,
--     created_at
-- FROM profiles
-- WHERE username = 'your-username';