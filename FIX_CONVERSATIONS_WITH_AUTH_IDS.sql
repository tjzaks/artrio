-- The problem: conversations table references auth.users, not profiles!

-- 1. First, let's see the auth users
SELECT id, email, created_at FROM auth.users;

-- 2. Match auth users with profiles
SELECT 
  au.id as auth_user_id,
  au.email,
  p.user_id as profile_user_id,
  p.username
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
ORDER BY au.created_at;

-- 3. Check if profiles are using the correct auth user IDs
SELECT 
  p.user_id,
  p.username,
  EXISTS(SELECT 1 FROM auth.users WHERE id = p.user_id::uuid) as auth_user_exists
FROM profiles p;

-- 4. If the profiles have wrong user_ids, we need to update them
-- First, let's see what we're dealing with
SELECT 
  p.username,
  p.user_id as current_user_id,
  au.id as correct_auth_id
FROM profiles p
LEFT JOIN auth.users au ON LOWER(au.email) LIKE LOWER(p.username || '%')
   OR LOWER(au.email) LIKE '%' || LOWER(p.username) || '%';

-- 5. Create conversations using the ACTUAL auth.users IDs
-- Get the auth IDs first, then manually create conversations
SELECT 
  au.id as auth_id,
  au.email,
  p.username
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id;

-- 6. After you identify the correct auth.users IDs, create conversations like this:
-- (Replace these with actual auth.users IDs from query above)
/*
INSERT INTO conversations (user1_id, user2_id)
SELECT 
  'AUTH_USER_ID_1'::uuid,
  'AUTH_USER_ID_2'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM conversations 
  WHERE (user1_id = 'AUTH_USER_ID_1'::uuid AND user2_id = 'AUTH_USER_ID_2'::uuid)
     OR (user2_id = 'AUTH_USER_ID_1'::uuid AND user1_id = 'AUTH_USER_ID_2'::uuid)
);
*/