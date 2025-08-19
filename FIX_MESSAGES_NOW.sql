-- Run these queries in order to diagnose messaging issues

-- STEP 1: Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'tyler@gmail.com' OR email = 'tszaks@gmail.com';
-- Copy the ID from the result above

-- STEP 2: Check all conversations
SELECT 
  c.*,
  p1.username as user1_name,
  p2.username as user2_name
FROM conversations c
LEFT JOIN profiles p1 ON p1.user_id = c.user1_id
LEFT JOIN profiles p2 ON p2.user_id = c.user2_id
ORDER BY c.created_at DESC;

-- STEP 3: Check profiles table
SELECT user_id, username, created_at FROM profiles ORDER BY created_at DESC;

-- STEP 4: Check for orphaned conversations (conversations with missing users)
SELECT c.id as conv_id, c.user1_id, c.user2_id,
  EXISTS(SELECT 1 FROM profiles WHERE user_id = c.user1_id) as user1_exists,
  EXISTS(SELECT 1 FROM profiles WHERE user_id = c.user2_id) as user2_exists
FROM conversations c
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = c.user1_id)
   OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = c.user2_id);

-- STEP 5: Create a test conversation between two existing users
-- First, see what users exist
SELECT user_id, username FROM profiles LIMIT 5;

-- STEP 6: If you need to create a conversation manually
-- Replace these IDs with actual user IDs from the profiles table
/*
INSERT INTO conversations (user1_id, user2_id)
SELECT 
  (SELECT user_id FROM profiles WHERE username = 'tszaks' LIMIT 1),
  (SELECT user_id FROM profiles WHERE username = 'tobyszaks' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM conversations 
  WHERE (user1_id = (SELECT user_id FROM profiles WHERE username = 'tszaks' LIMIT 1) 
     AND user2_id = (SELECT user_id FROM profiles WHERE username = 'tobyszaks' LIMIT 1))
     OR (user2_id = (SELECT user_id FROM profiles WHERE username = 'tszaks' LIMIT 1) 
     AND user1_id = (SELECT user_id FROM profiles WHERE username = 'tobyszaks' LIMIT 1))
);
*/