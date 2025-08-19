-- Fix infinite recursion in conversation_participants policies
-- This is causing messages not to display

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversation_participants;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view their conversations" ON public.conversation_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can create conversations" ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- Also check and fix conversations table policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id 
      FROM public.conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Fix messages table policies too
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM public.conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Verify the fix by testing a simple query
-- This should not cause recursion anymore
SELECT COUNT(*) FROM public.conversation_participants WHERE user_id = auth.uid();