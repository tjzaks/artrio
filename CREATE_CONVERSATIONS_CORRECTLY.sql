-- Create conversations using the CORRECT auth.users IDs

-- Create conversation: tobyszaks <-> tszaks
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid   -- tszaks
)
ON CONFLICT DO NOTHING;

-- Create conversation: jon_b <-> tszaks
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  'c45a14ee-ccec-47d6-9f57-dfe6956f1922'::uuid,  -- jon_b
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid   -- tszaks
)
ON CONFLICT DO NOTHING;

-- Create conversation: tzak <-> tszaks
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '4be0d718-924f-4b50-8506-d5534f43808b'::uuid,  -- tzak
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid   -- tszaks
)
ON CONFLICT DO NOTHING;

-- Create conversation: tobyszaks <-> tzak
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  '4be0d718-924f-4b50-8506-d5534f43808b'::uuid   -- tzak
)
ON CONFLICT DO NOTHING;

-- Create conversation: jon_b <-> tzak
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  'c45a14ee-ccec-47d6-9f57-dfe6956f1922'::uuid,  -- jon_b
  '4be0d718-924f-4b50-8506-d5534f43808b'::uuid   -- tzak
)
ON CONFLICT DO NOTHING;

-- Create conversation: tobyszaks <-> jon_b
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  'c45a14ee-ccec-47d6-9f57-dfe6956f1922'::uuid   -- jon_b
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

-- Count total conversations
SELECT COUNT(*) as total_conversations FROM conversations;