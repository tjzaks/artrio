-- Check tzak's profile for any fields that might store notification counts
SELECT * FROM profiles 
WHERE user_id = '4be0d718-924f-4b50-8508-d5534f43808b';

-- Check if there are any stored notification preferences or counts
SELECT * FROM auth.users 
WHERE id = '4be0d718-924f-4b50-8508-d5534f43808b';

-- Check for any user metadata
SELECT 
    id,
    email,
    raw_user_meta_data,
    raw_app_meta_data
FROM auth.users 
WHERE id = '4be0d718-924f-4b50-8508-d5534f43808b';