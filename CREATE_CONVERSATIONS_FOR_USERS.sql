-- Create conversations between existing users

-- First, let's see what we have
SELECT user_id, username FROM profiles;

-- Create conversations between users (avoiding duplicates)
-- tszaks <-> tobyszaks
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '499b105b-4562-4135-81cc-36dd77438f73',  -- tszaks
  '7bb22480-1d1a-4d91-af1d-af008290af53'   -- tobyszaks
)
ON CONFLICT DO NOTHING;

-- tszaks <-> tzak
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '4be0d718-924f-4b50-8506-d5534f43808b',  -- tzak
  '499b105b-4562-4135-81cc-36dd77438f73'   -- tszaks
)
ON CONFLICT DO NOTHING;

-- tszaks <-> jon_b
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  'c45a14ee-ccec-47d6-9f57-dfe6956f1922',  -- jon_b
  '499b105b-4562-4135-81cc-36dd77438f73'   -- tszaks
)
ON CONFLICT DO NOTHING;

-- tzak <-> tobyszaks
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '4be0d718-924f-4b50-8506-d5534f43808b',  -- tzak
  '7bb22480-1d1a-4d91-af1d-af008290af53'   -- tobyszaks
)
ON CONFLICT DO NOTHING;

-- Verify conversations were created
SELECT 
  c.id,
  p1.username as user1,
  p2.username as user2,
  c.created_at
FROM conversations c
JOIN profiles p1 ON p1.user_id = c.user1_id
JOIN profiles p2 ON p2.user_id = c.user2_id
ORDER BY c.created_at DESC;