-- Automatically insert test messages using existing conversations

-- First check what conversations exist
SELECT id, user1_id, user2_id FROM conversations LIMIT 5;

-- Insert messages for ALL existing conversations
INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
SELECT 
  c.id as conversation_id,
  c.user1_id as sender_id,
  'Hey! This is a test message from user1' as content,
  false as is_read,
  NOW() - INTERVAL '10 minutes' as created_at
FROM conversations c
UNION ALL
SELECT 
  c.id,
  c.user2_id,
  'Hi there! Test message from user2',
  false,
  NOW() - INTERVAL '8 minutes'
FROM conversations c
UNION ALL
SELECT 
  c.id,
  c.user1_id,
  'How are you doing?',
  false,
  NOW() - INTERVAL '6 minutes'
FROM conversations c
UNION ALL
SELECT 
  c.id,
  c.user2_id,
  'Pretty good! Just testing out Artrio',
  false,
  NOW() - INTERVAL '4 minutes'
FROM conversations c
UNION ALL
SELECT 
  c.id,
  c.user1_id,
  'Same here! The app looks great',
  false,
  NOW() - INTERVAL '2 minutes'
FROM conversations c;

-- Verify messages were created
SELECT COUNT(*) as total_messages FROM messages;

-- Show the messages
SELECT 
  m.content,
  m.created_at,
  p.username as sender_name,
  c.id as conv_id
FROM messages m
JOIN profiles p ON p.user_id = m.sender_id
JOIN conversations c ON c.id = m.conversation_id
ORDER BY m.conversation_id, m.created_at DESC
LIMIT 20;