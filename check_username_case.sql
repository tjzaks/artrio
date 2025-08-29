-- Check exact username casing in the database
SELECT 
    username,
    phone_number,
    LENGTH(phone_number) as phone_length,
    user_id
FROM profiles 
WHERE LOWER(username) IN ('tobyszaks', 'jonny_b_good', 'tzak')
ORDER BY username;

-- Check what the RPC returns with exact casing
SELECT 
    username,
    phone,
    email
FROM admin_get_all_user_data()
WHERE username IN ('tobyszaks', 'Jonny_B_Good', 'tzak')  -- Note the capital letters
ORDER BY created_at DESC
LIMIT 10;