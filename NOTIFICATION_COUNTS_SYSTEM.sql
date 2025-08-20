-- SIMPLE NOTIFICATION COUNTS SYSTEM
-- Instagram/WhatsApp approach - separate table for counts

-- =====================================================
-- STEP 1: CREATE NOTIFICATION COUNTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  unread_count INTEGER DEFAULT 0 CHECK (unread_count >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per conversation
  UNIQUE(user_id, conversation_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_counts_user_id ON notification_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_counts_conversation_id ON notification_counts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notification_counts_user_conv ON notification_counts(user_id, conversation_id);

-- =====================================================
-- STEP 2: CREATE SIMPLE FUNCTIONS
-- =====================================================

-- Function 1: Increment unread count for a user in a conversation
CREATE OR REPLACE FUNCTION increment_unread_count(
  p_user_id UUID,
  p_conversation_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update the count
  INSERT INTO notification_counts (user_id, conversation_id, unread_count, updated_at)
  VALUES (p_user_id, p_conversation_id, 1, NOW())
  ON CONFLICT (user_id, conversation_id)
  DO UPDATE SET 
    unread_count = notification_counts.unread_count + 1,
    updated_at = NOW();
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'conversation_id', p_conversation_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function 2: Reset unread count to 0 for a user in a conversation
CREATE OR REPLACE FUNCTION reset_unread_count(
  p_user_id UUID,
  p_conversation_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set count to 0 (or insert if doesn't exist)
  INSERT INTO notification_counts (user_id, conversation_id, unread_count, updated_at)
  VALUES (p_user_id, p_conversation_id, 0, NOW())
  ON CONFLICT (user_id, conversation_id)
  DO UPDATE SET 
    unread_count = 0,
    updated_at = NOW();
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'conversation_id', p_conversation_id,
    'unread_count', 0
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function 3: Get total unread count for a user (for navigation badge)
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0)
  INTO v_total
  FROM notification_counts
  WHERE user_id = p_user_id;
  
  RETURN v_total;
END;
$$;

-- Function 4: Get unread counts for all conversations (for conversation list)
CREATE OR REPLACE FUNCTION get_conversation_unread_counts(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT nc.conversation_id, nc.unread_count
  FROM notification_counts nc
  WHERE nc.user_id = p_user_id
    AND nc.unread_count > 0;
END;
$$;

-- =====================================================
-- STEP 3: CREATE TRIGGER FOR AUTOMATIC COUNTING
-- =====================================================

-- Trigger function: When a message is inserted, increment count for recipient
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_id UUID;
  v_conversation conversations%ROWTYPE;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  -- Determine who the recipient is (the user who didn't send the message)
  IF v_conversation.user1_id = NEW.sender_id THEN
    v_recipient_id := v_conversation.user2_id;
  ELSE
    v_recipient_id := v_conversation.user1_id;
  END IF;
  
  -- Increment unread count for the recipient
  PERFORM increment_unread_count(v_recipient_id, NEW.conversation_id);
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_new_message ON messages;
CREATE TRIGGER trigger_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_message();

-- =====================================================
-- STEP 4: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions on table
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_counts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_counts TO service_role;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION increment_unread_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_unread_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_unread_counts(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION increment_unread_count(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reset_unread_count(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_total_unread_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_conversation_unread_counts(UUID) TO service_role;

-- =====================================================
-- STEP 5: INITIAL DATA POPULATION (OPTIONAL)
-- =====================================================

-- Populate existing unread counts from current messages
INSERT INTO notification_counts (user_id, conversation_id, unread_count, updated_at)
SELECT 
  CASE 
    WHEN c.user1_id != m.sender_id THEN c.user1_id
    ELSE c.user2_id
  END as user_id,
  m.conversation_id,
  COUNT(*) as unread_count,
  NOW()
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE m.is_read = false
GROUP BY 
  CASE 
    WHEN c.user1_id != m.sender_id THEN c.user1_id
    ELSE c.user2_id
  END,
  m.conversation_id
ON CONFLICT (user_id, conversation_id) DO NOTHING;

-- =====================================================
-- STEP 6: VERIFICATION QUERIES
-- =====================================================

-- Check that everything was created
SELECT 'Table created' as status, COUNT(*) as records FROM notification_counts;

SELECT 'Functions created' as status, COUNT(*) as functions
FROM pg_proc 
WHERE proname IN (
  'increment_unread_count', 
  'reset_unread_count', 
  'get_total_unread_count', 
  'get_conversation_unread_counts'
);

SELECT 'Trigger created' as status, COUNT(*) as triggers
FROM pg_trigger 
WHERE tgname = 'trigger_new_message';

-- Test functions exist
SELECT proname, pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%unread%';