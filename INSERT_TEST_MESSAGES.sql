-- After running CREATE_ALL_CONVERSATIONS_NOW.sql, let's add some test messages

-- First verify conversations exist
SELECT 
  c.id as conversation_id,
  p1.username as user1,
  p2.username as user2
FROM conversations c
JOIN profiles p1 ON p1.user_id = c.user1_id
JOIN profiles p2 ON p2.user_id = c.user2_id;

-- Add test messages to each conversation
-- Message 1: tszaks to tobyszaks
INSERT INTO messages (conversation_id, sender_id, content)
SELECT 
  c.id,
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid,  -- tszaks
  'Hey Toby! How are you doing?'
FROM conversations c
WHERE (c.user1_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid AND c.user2_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid)
   OR (c.user2_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid AND c.user1_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid);

-- Message 2: tobyszaks replies
INSERT INTO messages (conversation_id, sender_id, content)
SELECT 
  c.id,
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  'Hey! Doing great, just testing the app'
FROM conversations c
WHERE (c.user1_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid AND c.user2_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid)
   OR (c.user2_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid AND c.user1_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid);

-- Message 3: tzak to tszaks
INSERT INTO messages (conversation_id, sender_id, content)
SELECT 
  c.id,
  '4be0d718-924f-4b50-8508-d5534f43808b'::uuid,  -- tzak (FIXED ID)
  'Welcome to Artrio!'
FROM conversations c
WHERE (c.user1_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid AND c.user2_id = '4be0d718-924f-4b50-8508-d5534f43808b'::uuid)
   OR (c.user2_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid AND c.user1_id = '4be0d718-924f-4b50-8508-d5534f43808b'::uuid);

-- Message 4: jon_b to tszaks
INSERT INTO messages (conversation_id, sender_id, content)
SELECT 
  c.id,
  'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid,  -- jon_b (FIXED ID)
  'This messaging system is working great!'
FROM conversations c
WHERE (c.user1_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid AND c.user2_id = 'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid)
   OR (c.user2_id = '499b105b-4562-4135-81cc-36dd77438f73'::uuid AND c.user1_id = 'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid);

-- Message 5: tobyszaks to tzak
INSERT INTO messages (conversation_id, sender_id, content)
SELECT 
  c.id,
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid,  -- tobyszaks
  'Have you tried the trios feature yet?'
FROM conversations c
WHERE (c.user1_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid AND c.user2_id = '4be0d718-924f-4b50-8508-d5534f43808b'::uuid)
   OR (c.user2_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid AND c.user1_id = '4be0d718-924f-4b50-8508-d5534f43808b'::uuid);

-- Message 6: jon_b to tobyszaks
INSERT INTO messages (conversation_id, sender_id, content)
SELECT 
  c.id,
  'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid,  -- jon_b
  'The app is looking good!'
FROM conversations c
WHERE (c.user1_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid AND c.user2_id = 'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid)
   OR (c.user2_id = '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid AND c.user1_id = 'c45a14ee-ccec-47d6-9f57-dfe6950f1922'::uuid);

-- Verify messages were created
SELECT 
  m.id,
  m.content,
  p_sender.username as sender,
  c.id as conversation_id,
  m.created_at
FROM messages m
JOIN profiles p_sender ON p_sender.user_id = m.sender_id
JOIN conversations c ON c.id = m.conversation_id
ORDER BY m.created_at DESC;

-- Count total messages
SELECT COUNT(*) as total_messages FROM messages;