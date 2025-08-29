-- SIMPLE SCRIPT TO ADD PHONE NUMBERS FOR TOBY AND JON
-- Run this in Supabase SQL Editor

-- 1. First check who needs phone numbers
SELECT username, phone_number, user_id 
FROM profiles 
WHERE username IN ('tobyszaks', 'Jonny_B_Good', 'jonny b')
ORDER BY username;

-- 2. ADD TOBY'S PHONE (replace with his actual number)
UPDATE profiles 
SET phone_number = '5555551234'  -- ← CHANGE THIS TO TOBY'S REAL PHONE (digits only, no dashes)
WHERE username = 'tobyszaks';

-- 3. ADD JON'S PHONE (replace with his actual number)  
UPDATE profiles 
SET phone_number = '5555555678'  -- ← CHANGE THIS TO JON'S REAL PHONE (digits only, no dashes)
WHERE LOWER(username) = LOWER('Jonny_B_Good');

-- 4. Verify it worked
SELECT 
    username,
    phone_number,
    CASE 
        WHEN phone_number IS NOT NULL AND LENGTH(phone_number) = 10 THEN 
            '(' || SUBSTRING(phone_number, 1, 3) || ') ' || 
            SUBSTRING(phone_number, 4, 3) || '-' || 
            SUBSTRING(phone_number, 7, 4)
        ELSE phone_number
    END as formatted_phone
FROM profiles 
WHERE username IN ('tobyszaks', 'Jonny_B_Good', 'tzak')
ORDER BY username;

-- After running this, refresh the admin page and the phone numbers should appear!