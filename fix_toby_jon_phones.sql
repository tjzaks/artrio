-- First, let's check what we have for Toby and Jon
SELECT 
    p.username,
    p.user_id,
    p.phone_number as profile_phone,
    au.email,
    au.raw_user_meta_data->>'phone' as auth_phone,
    au.raw_user_meta_data->>'username' as auth_username
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE LOWER(p.username) IN ('tobyszaks', 'jonny_b_good', 'jonny b')
ORDER BY p.created_at DESC;

-- IMPORTANT: Replace these with the actual phone numbers!
-- These are placeholder numbers - you need to update them with real ones

-- Update Toby's phone number in profiles table
UPDATE profiles 
SET phone_number = '2155551234'  -- TODO: Replace with Toby's actual phone (digits only)
WHERE username = 'tobyszaks'
RETURNING username, phone_number;

-- Update Jon's phone number in profiles table
-- Note: His username might be 'Jonny_B_Good' or 'jonny b' - checking both
UPDATE profiles 
SET phone_number = '2155555678'  -- TODO: Replace with Jon's actual phone (digits only)
WHERE LOWER(username) IN ('jonny_b_good', 'jonny b')
RETURNING username, phone_number;

-- Also update the auth.users metadata to keep it in sync
UPDATE auth.users
SET raw_user_meta_data = 
    CASE 
        WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('phone', '2155551234')  -- TODO: Use Toby's actual phone
        ELSE 
            raw_user_meta_data || jsonb_build_object('phone', '2155551234')
    END
WHERE id IN (
    SELECT user_id FROM profiles WHERE username = 'tobyszaks'
);

UPDATE auth.users
SET raw_user_meta_data = 
    CASE 
        WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('phone', '2155555678')  -- TODO: Use Jon's actual phone
        ELSE 
            raw_user_meta_data || jsonb_build_object('phone', '2155555678')
    END
WHERE id IN (
    SELECT user_id FROM profiles WHERE LOWER(username) IN ('jonny_b_good', 'jonny b')
);

-- Verify the updates worked
SELECT 
    p.username,
    p.phone_number as profile_phone,
    au.raw_user_meta_data->>'phone' as auth_phone,
    CASE 
        WHEN p.phone_number IS NOT NULL AND p.phone_number != '' THEN 
            '(' || SUBSTRING(p.phone_number, 1, 3) || ') ' || 
            SUBSTRING(p.phone_number, 4, 3) || '-' || 
            SUBSTRING(p.phone_number, 7, 4)
        ELSE 'No phone'
    END as formatted_phone
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE p.username IN ('tobyszaks', 'Jonny_B_Good', 'jonny b', 'tzak', 'tyler')
ORDER BY p.username;

-- Test what the admin RPC function will return
SELECT 
    username,
    phone,
    email,
    is_admin
FROM admin_get_all_user_data(NULL)
WHERE username IN ('tobyszaks', 'jonny_b_good', 'tzak')
ORDER BY created_at DESC;