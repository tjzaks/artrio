-- All 4 users are VALID! Let's create conversations between them

-- 1. tobyszaks <-> tszaks
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid,  -- tszaks
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid   -- tobyszaks
)
ON CONFLICT DO NOTHING;

-- 2. tzak <-> tszaks
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid,  -- tszaks
  '4be0d718-924f-4b50-8508-d5534f43808b'::uuid   -- tzak (FIXED THE ID!)
)
ON CONFLICT DO NOTHING;

-- 3. jon_b <-> tszaks
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid,  -- tszaks
  'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid   -- jon_b (FIXED THE ID!)
)
ON CONFLICT DO NOTHING;

-- 4. tobyszaks <-> tzak
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  '4be0d718-924f-4b50-8508-d5534f43808b'::uuid   -- tzak
)
ON CONFLICT DO NOTHING;

-- 5. tobyszaks <-> jon_b
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid   -- jon_b
)
ON CONFLICT DO NOTHING;

-- 6. tzak <-> jon_b
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '4be0d718-924f-4b50-8508-d5534f43808b'::uuid,  -- tzak
  'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid   -- jon_b
)
ON CONFLICT DO NOTHING;

-- Verify all conversations were created
SELECT 
  c.id,
  p1.username as user1,
  p2.username as user2,
  c.created_at
FROM conversations c
JOIN profiles p1 ON p1.user_id = c.user1_id
JOIN profiles p2 ON p2.user_id = c.user2_id
ORDER BY c.created_at DESC;

-- Count total conversations (should be 6)
SELECT COUNT(*) as total_conversations FROM conversations;