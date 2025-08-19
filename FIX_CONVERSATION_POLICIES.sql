-- Fix the infinite recursion in conversation policies
-- This happens when policies reference each other in a circular way

-- First, let's check current policies
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
WHERE tablename = 'conversations';

-- Drop the problematic policies
DROP POLICY IF EXISTS "conversation_participants" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;

-- Create simplified policies that don't cause recursion
-- Allow users to view conversations they're part of
CREATE POLICY "view_own_conversations" ON conversations
  FOR SELECT
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- Allow users to create conversations
CREATE POLICY "create_conversations" ON conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- Allow users to update their own conversations
CREATE POLICY "update_own_conversations" ON conversations
  FOR UPDATE
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- Allow users to delete their own conversations
CREATE POLICY "delete_own_conversations" ON conversations
  FOR DELETE
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- Verify the new policies
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
WHERE tablename = 'conversations';

-- Test creating a conversation (replace with actual user IDs)
-- This should work without recursion errors
/*
INSERT INTO conversations (user1_id, user2_id)
VALUES (
  '499b105b-4562-4135-81cc-36dd77438f73'::uuid,  -- tszaks
  '7bb22480-1d1a-4d91-af1d-af008290af53'::uuid   -- tobyszaks
)
ON CONFLICT DO NOTHING;
*/