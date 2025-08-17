-- Check and fix Tyler's admin status
SELECT username, is_admin, user_id 
FROM profiles 
WHERE username = 'tyler';

-- Make Tyler admin
UPDATE profiles 
SET is_admin = true 
WHERE username = 'tyler'
RETURNING username, is_admin;

-- Also check if admin column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'is_admin';
