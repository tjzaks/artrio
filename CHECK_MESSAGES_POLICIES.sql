-- Check policies on the messages table
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

-- If there are problematic policies, drop and recreate them
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create simple policies for messages
-- Users can view messages in conversations they're part of
CREATE POLICY "view_messages_in_conversations" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Users can insert messages in conversations they're part of
CREATE POLICY "send_messages_to_conversations" ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

-- Users can update their own messages
CREATE POLICY "update_own_messages" ON messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- Users can delete their own messages  
CREATE POLICY "delete_own_messages" ON messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- Test that we can read messages (replace with actual conversation ID)
/*
SELECT * FROM messages 
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
LIMIT 10;
*/