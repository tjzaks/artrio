-- Check current phone numbers for all users
SELECT 
    p.username,
    p.user_id,
    p.phone_number,
    p.created_at
FROM profiles p
WHERE p.username IN ('tobyszaks', 'jonny_b_good', 'tzak', 'tszaks')
ORDER BY p.created_at DESC;

-- Check if phone numbers exist in auth.users metadata
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'username' as username,
    au.raw_user_meta_data->>'phone' as meta_phone,
    au.created_at
FROM auth.users au
WHERE au.raw_user_meta_data->>'username' IN ('tobyszaks', 'jonny_b_good', 'tzak', 'tszaks');

-- Update Toby's phone number (tobyszaks)
UPDATE profiles 
SET phone_number = '5555551234'  -- Replace with Toby's actual phone
WHERE username = 'tobyszaks' 
AND (phone_number IS NULL OR phone_number = '');

-- Update Jon's phone number (Jonny_B_Good)  
UPDATE profiles 
SET phone_number = '5555555678'  -- Replace with Jon's actual phone
WHERE LOWER(username) = 'jonny_b_good'
AND (phone_number IS NULL OR phone_number = '');

-- Verify the updates
SELECT 
    username,
    phone_number,
    CASE 
        WHEN phone_number IS NOT NULL AND phone_number != '' THEN 'Has Phone'
        ELSE 'No Phone'
    END as phone_status
FROM profiles
WHERE username IN ('tobyszaks', 'jonny_b_good', 'tzak', 'tszaks', 'tyler')
ORDER BY username;

-- Also check if we need to update auth.users metadata
-- This updates the phone in the auth metadata to match profiles
UPDATE auth.users
SET raw_user_meta_data = 
    CASE 
        WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('phone', p.phone_number)
        ELSE 
            raw_user_meta_data || jsonb_build_object('phone', p.phone_number)
    END
FROM profiles p
WHERE auth.users.id = p.user_id
AND p.username IN ('tobyszaks', 'jonny_b_good')
AND p.phone_number IS NOT NULL
AND p.phone_number != '';

-- Final check - what the admin dashboard should show
SELECT 
    p.user_id,
    p.username,
    p.phone_number,
    au.email,
    au.raw_user_meta_data->>'phone' as auth_phone,
    p.is_admin,
    p.created_at
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
ORDER BY p.created_at DESC
LIMIT 20;