-- Debug: Check messages table structure and data
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if messages exist at all
SELECT COUNT(*) as total_messages FROM messages;

-- 2. Show recent messages with all details
SELECT 
  m.id,
  m.conversation_id,
  m.sender_id,
  m.content,
  m.created_at,
  m.is_read,
  c.user1_id,
  c.user2_id,
  p.username as sender_username,
  p.user_id as sender_user_id
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
LEFT JOIN profiles p ON p.user_id = m.sender_id
ORDER BY m.created_at DESC
LIMIT 10;

-- 3. Check conversation participants
SELECT 
  cp.conversation_id,
  cp.user_id,
  p.username
FROM conversation_participants cp
JOIN profiles p ON p.user_id = cp.user_id
ORDER BY cp.conversation_id;

-- 4. Check if there's a mismatch between sender_id and profiles
SELECT DISTINCT
  m.sender_id,
  p.user_id,
  p.username,
  CASE WHEN p.user_id IS NULL THEN 'MISSING PROFILE' ELSE 'OK' END as status
FROM messages m
LEFT JOIN profiles p ON p.user_id = m.sender_id;

-- 5. Show conversations with message counts
SELECT 
  c.id as conversation_id,
  c.user1_id,
  c.user2_id,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id, c.user1_id, c.user2_id
ORDER BY last_message_at DESC;

-- 6. Check if RLS policies might be blocking access
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;