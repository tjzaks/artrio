-- COMPREHENSIVE TEST SUITE FOR NOTIFICATION COUNTS SYSTEM
-- Run this after creating the system to test all scenarios

-- =====================================================
-- SETUP: Get test data
-- =====================================================

-- Check we have some users and conversations
SELECT 'Users in system:' as test, COUNT(*) as count FROM auth.users;
SELECT 'Conversations in system:' as test, COUNT(*) as count FROM conversations;
SELECT 'Messages in system:' as test, COUNT(*) as count FROM messages;

-- Get some test IDs (replace these with actual IDs from your system)
SELECT 
  'Test data:' as info,
  (SELECT id FROM auth.users LIMIT 1) as user1_id,
  (SELECT id FROM auth.users OFFSET 1 LIMIT 1) as user2_id,
  (SELECT id FROM conversations LIMIT 1) as conversation_id;

-- =====================================================
-- TEST 1: Basic Function Tests
-- =====================================================

-- Test increment function
SELECT '=== TEST 1: Testing increment_unread_count ===' as test_name;

-- Replace with actual user and conversation IDs
SELECT increment_unread_count(
  'your-user-id-here'::UUID, 
  'your-conversation-id-here'::UUID
) as increment_result;

-- Check the result
SELECT * FROM notification_counts 
WHERE user_id = 'your-user-id-here'::UUID 
  AND conversation_id = 'your-conversation-id-here'::UUID;

-- =====================================================
-- TEST 2: Reset Function Test
-- =====================================================

SELECT '=== TEST 2: Testing reset_unread_count ===' as test_name;

-- Reset the count
SELECT reset_unread_count(
  'your-user-id-here'::UUID, 
  'your-conversation-id-here'::UUID
) as reset_result;

-- Check it was reset to 0
SELECT * FROM notification_counts 
WHERE user_id = 'your-user-id-here'::UUID 
  AND conversation_id = 'your-conversation-id-here'::UUID;

-- =====================================================
-- TEST 3: Total Count Function
-- =====================================================

SELECT '=== TEST 3: Testing get_total_unread_count ===' as test_name;

-- Add some test counts
SELECT increment_unread_count('your-user-id-here'::UUID, 'your-conversation-id-here'::UUID);
SELECT increment_unread_count('your-user-id-here'::UUID, 'your-conversation-id-here'::UUID);

-- Get total (should be 2)
SELECT get_total_unread_count('your-user-id-here'::UUID) as total_unread;

-- =====================================================
-- TEST 4: Conversation Counts Function
-- =====================================================

SELECT '=== TEST 4: Testing get_conversation_unread_counts ===' as test_name;

-- Get conversation-specific counts
SELECT * FROM get_conversation_unread_counts('your-user-id-here'::UUID);

-- =====================================================
-- TEST 5: Trigger Test (Message Insert)
-- =====================================================

SELECT '=== TEST 5: Testing automatic trigger ===' as test_name;

-- Check counts before
SELECT 'Before message insert:' as status, * FROM notification_counts 
WHERE user_id IN (
  SELECT CASE 
    WHEN user1_id = 'your-sender-id'::UUID THEN user2_id 
    ELSE user1_id 
  END 
  FROM conversations 
  WHERE id = 'your-conversation-id-here'::UUID
);

-- Insert a test message (this should trigger increment)
INSERT INTO messages (
  conversation_id, 
  sender_id, 
  content, 
  created_at
) VALUES (
  'your-conversation-id-here'::UUID,
  'your-sender-id'::UUID,
  'Test message to trigger notification',
  NOW()
);

-- Check counts after (should be incremented)
SELECT 'After message insert:' as status, * FROM notification_counts 
WHERE user_id IN (
  SELECT CASE 
    WHEN user1_id = 'your-sender-id'::UUID THEN user2_id 
    ELSE user1_id 
  END 
  FROM conversations 
  WHERE id = 'your-conversation-id-here'::UUID
);

-- =====================================================
-- TEST 6: Edge Cases
-- =====================================================

SELECT '=== TEST 6: Testing edge cases ===' as test_name;

-- Test with non-existent conversation
SELECT increment_unread_count(
  'your-user-id-here'::UUID, 
  'non-existent-conversation-id'::UUID
) as should_fail;

-- Test with non-existent user
SELECT increment_unread_count(
  'non-existent-user-id'::UUID, 
  'your-conversation-id-here'::UUID
) as should_fail;

-- Test negative scenarios
SELECT get_total_unread_count('non-existent-user-id'::UUID) as should_be_zero;

-- =====================================================
-- TEST 7: Performance Test
-- =====================================================

SELECT '=== TEST 7: Performance test ===' as test_name;

-- Time the total count function
SELECT 
  'Performance test:' as test,
  get_total_unread_count('your-user-id-here'::UUID) as result,
  NOW() as timestamp;

-- =====================================================
-- TEST 8: Cleanup
-- =====================================================

SELECT '=== TEST 8: Cleanup test data ===' as test_name;

-- Clean up test data
DELETE FROM messages WHERE content = 'Test message to trigger notification';
DELETE FROM notification_counts WHERE user_id = 'your-user-id-here'::UUID;

-- =====================================================
-- FINAL STATUS CHECK
-- =====================================================

SELECT '=== FINAL STATUS ===' as test_name;

SELECT 
  'notification_counts table' as component,
  COUNT(*) as records
FROM notification_counts;

SELECT 
  'Functions available' as component,
  COUNT(*) as count
FROM pg_proc 
WHERE proname LIKE '%unread%';

SELECT 
  'Triggers active' as component,
  COUNT(*) as count
FROM pg_trigger 
WHERE tgname = 'trigger_new_message';

-- List all notification-related functions
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%unread%' OR proname LIKE '%notification%';