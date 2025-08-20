-- Debug the message reading issue
-- Let's see what's actually in the messages table

-- 1. Check messages table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check current unread messages for a specific conversation
-- Replace 'your-conversation-id' with actual ID from the conversation
SELECT 
  id,
  conversation_id,
  sender_id,
  content,
  is_read,
  created_at
FROM messages 
WHERE conversation_id = (
  SELECT id FROM conversations 
  WHERE user1_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
     OR user2_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
  LIMIT 1
)
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there are any RLS policies blocking updates
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
WHERE tablename = 'messages';

-- 4. Test manual update (replace with actual conversation ID)
UPDATE messages 
SET is_read = true 
WHERE conversation_id = 'your-conversation-id-here'
  AND is_read = false
  AND sender_id != auth.uid();