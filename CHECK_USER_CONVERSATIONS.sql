-- Debug: Check what user is logged in and their conversations

-- 1. Check the current user (you'll need to replace with your actual user ID)
-- Get this from the browser console or network tab
SELECT id, email FROM auth.users WHERE email = 'tszaks@gmail.com';

-- 2. Check all conversations
SELECT 
  c.*,
  p1.username as user1_name,
  p2.username as user2_name
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.user1_id
LEFT JOIN profiles p2 ON p2.user_id = c.user2_id
ORDER BY c.created_at DESC;

-- 3. Check if your user ID appears in any conversations
-- Replace 'YOUR_USER_ID' with your actual auth user ID
SELECT * FROM conversations 
WHERE user1_id = 'YOUR_USER_ID' 
   OR user2_id = 'YOUR_USER_ID';

-- 4. Check profiles table
SELECT user_id, username FROM profiles;

-- 5. Check for any orphaned conversations (missing profile links)
SELECT c.* 
FROM conversations c
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = c.user1_id)
   OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = c.user2_id);