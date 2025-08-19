-- First, let's see which user IDs actually exist in auth.users
SELECT id, email FROM auth.users;

-- Check which profiles have valid auth users
SELECT 
  p.username,
  p.user_id,
  CASE WHEN au.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as auth_status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.user_id;

-- Only create conversations between users that EXIST in auth.users
-- Based on your screenshot, these should work:

-- Create conversation: tobyszaks <-> tszaks
INSERT INTO conversations (user1_id, user2_id)
SELECT 
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid   -- tszaks
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid)
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM conversations 
    WHERE (user1_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid AND user2_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
       OR (user2_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid AND user1_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
  );

-- Create conversation: tzak <-> tszaks
INSERT INTO conversations (user1_id, user2_id)
SELECT 
  '4be0d718-924f-4b50-8506-d5534f43808b'::uuid,  -- tzak
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid   -- tszaks
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '4be0d718-924f-4b50-8506-d5534f43808b'::uuid)
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM conversations 
    WHERE (user1_id = '4be0d718-924f-4b50-8506-d5534f43808b'::uuid AND user2_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
       OR (user2_id = '4be0d718-924f-4b50-8506-d5534f43808b'::uuid AND user1_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
  );

-- Create conversation: tobyszaks <-> tzak  
INSERT INTO conversations (user1_id, user2_id)
SELECT 
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  '4be0d718-924f-4b50-8506-d5534f43808b'::uuid   -- tzak
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid)
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = '4be0d718-924f-4b50-8506-d5534f43808b'::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM conversations 
    WHERE (user1_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid AND user2_id = '4be0d718-924f-4b50-8506-d5534f43808b'::uuid)
       OR (user2_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid AND user1_id = '4be0d718-924f-4b50-8506-d5534f43808b'::uuid)
  );

-- If jon_b exists in auth.users, create conversation with him
INSERT INTO conversations (user1_id, user2_id)
SELECT 
  'c45a14ee-ccec-47d6-9f57-dfe6956f1922'::uuid,  -- jon_b
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid   -- tszaks
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = 'c45a14ee-ccec-47d6-9f57-dfe6956f1922'::uuid)
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM conversations 
    WHERE (user1_id = 'c45a14ee-ccec-47d6-9f57-dfe6956f1922'::uuid AND user2_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
       OR (user2_id = 'c45a14ee-ccec-47d6-9f57-dfe6956f1922'::uuid AND user1_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid)
  );

-- Verify what conversations were created
SELECT 
  c.id,
  p1.username as user1,
  p2.username as user2,
  c.created_at
FROM conversations c
JOIN profiles p1 ON p1.user_id = c.user1_id
JOIN profiles p2 ON p2.user_id = c.user2_id
ORDER BY c.created_at DESC;

-- Show which users are missing from auth.users
SELECT 
  p.username,
  p.user_id,
  'Profile exists but NO auth.users entry - DELETE THIS PROFILE' as issue
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id);