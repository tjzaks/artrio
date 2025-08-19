-- First, drop ALL existing policies on messages table
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "view_messages_in_conversations" ON messages;
DROP POLICY IF EXISTS "send_messages_to_conversations" ON messages;
DROP POLICY IF EXISTS "update_own_messages" ON messages;
DROP POLICY IF EXISTS "delete_own_messages" ON messages;

-- Create simple, non-conflicting policies for messages
-- Users can view messages in conversations they're part of
CREATE POLICY "allow_view_messages" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Users can insert messages in conversations they're part of
CREATE POLICY "allow_send_messages" ON messages
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
CREATE POLICY "allow_update_messages" ON messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- Users can delete their own messages  
CREATE POLICY "allow_delete_messages" ON messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- Verify the policies were created
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;