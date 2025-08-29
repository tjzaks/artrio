-- Test what the admin RPC function returns for these users
-- Run this as the admin user (you need to be logged in as an admin)

-- First, verify the phone numbers are in profiles
SELECT 
    username,
    user_id,
    phone_number,
    is_admin
FROM profiles 
WHERE username IN ('tobyszaks', 'Jonny_B_Good', 'tzak')
ORDER BY username;

-- Now test the admin RPC function to see what it returns
-- This is what the admin dashboard calls
SELECT 
    username,
    phone,
    email,
    is_admin,
    user_id
FROM admin_get_all_user_data()
WHERE username IN ('tobyszaks', 'Jonny_B_Good', 'tzak')
ORDER BY username;

-- If the RPC doesn't return phone data, check the function definition
-- The function should use: COALESCE(p.phone_number, u.raw_user_meta_data->>'phone')::TEXT as phone

-- Let's also check if it's a case sensitivity issue with usernames
SELECT 
    username,
    LOWER(username) as lower_username,
    phone
FROM admin_get_all_user_data()
WHERE LOWER(username) IN ('tobyszaks', 'jonny_b_good', 'tzak')
ORDER BY username;