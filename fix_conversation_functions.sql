-- Fix conversation functions for production
-- This ensures the get_or_create_conversation function exists and works

-- First, check if conversations table exists with correct structure
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_sender_id UUID REFERENCES auth.users(id),
  awaiting_response BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Create messages table if not exists
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing function to recreate
DROP FUNCTION IF EXISTS get_or_create_conversation(UUID);

-- Create the get_or_create_conversation function
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current user ID from auth
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Don't allow conversation with self
  IF v_current_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if the other user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_other_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if conversation already exists (either direction)
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (user1_id = LEAST(v_current_user_id, p_other_user_id) 
         AND user2_id = GREATEST(v_current_user_id, p_other_user_id))
  LIMIT 1;
  
  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    -- Insert with consistent ordering (smaller UUID first)
    INSERT INTO conversations (user1_id, user2_id)
    VALUES (
      LEAST(v_current_user_id, p_other_user_id),
      GREATEST(v_current_user_id, p_other_user_id)
    )
    ON CONFLICT (user1_id, user2_id) DO UPDATE 
    SET updated_at = NOW()
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Could not start conversation: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID) TO authenticated;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
  -- Conversations policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' 
    AND policyname = 'Users can view own conversations'
  ) THEN
    CREATE POLICY "Users can view own conversations" ON conversations
      FOR SELECT USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' 
    AND policyname = 'Users can create conversations'
  ) THEN
    CREATE POLICY "Users can create conversations" ON conversations
      FOR INSERT WITH CHECK (
        auth.uid() IN (user1_id, user2_id)
      );
  END IF;

  -- Messages policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Users can view messages in their conversations'
  ) THEN
    CREATE POLICY "Users can view messages in their conversations" ON messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM conversations
          WHERE id = messages.conversation_id
          AND (user1_id = auth.uid() OR user2_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Users can send messages'
  ) THEN
    CREATE POLICY "Users can send messages" ON messages
      FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM conversations
          WHERE id = messages.conversation_id
          AND (user1_id = auth.uid() OR user2_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Test the function exists
SELECT 'Function created successfully' as status;