-- EMERGENCY CLEANUP: Reduce Supabase usage to get under limits
-- Run each section carefully in Supabase SQL Editor

-- ========================================
-- 1. CHECK WHAT'S USING SPACE
-- ========================================
-- Check largest tables
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Check storage buckets usage
SELECT 
  name as bucket_name,
  COUNT(*) as file_count
FROM storage.objects
GROUP BY name
ORDER BY file_count DESC;

-- ========================================
-- 2. CLEAN UP OLD/UNNECESSARY DATA
-- ========================================

-- Delete old read messages (older than 7 days)
DELETE FROM messages 
WHERE is_read = true 
AND created_at < NOW() - INTERVAL '7 days';

-- Delete orphaned messages (conversations that don't exist)
DELETE FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c 
  WHERE c.id = m.conversation_id
);

-- Delete empty conversations (no messages)
DELETE FROM conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM messages m 
  WHERE m.conversation_id = c.id
);

-- Clean up old notification counts
DELETE FROM notification_counts
WHERE unread_count = 0;

-- Delete old stories (older than 24 hours - they should expire anyway)
DELETE FROM stories
WHERE created_at < NOW() - INTERVAL '24 hours';

-- Delete orphaned posts (from deleted trios)
DELETE FROM posts p
WHERE p.trio_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM trios t WHERE t.id = p.trio_id
);

-- Delete old admin logs (keep last 100)
DELETE FROM admin_logs
WHERE id NOT IN (
  SELECT id FROM admin_logs
  ORDER BY created_at DESC
  LIMIT 100
);

-- ========================================
-- 3. CLEAN UP STORAGE BUCKETS
-- ========================================

-- Get list of files to clean up (older than 7 days)
SELECT 
  name,
  id,
  created_at,
  metadata
FROM storage.objects
WHERE created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at ASC;

-- Delete old storage files (BE CAREFUL - this deletes actual files!)
-- Uncomment and run only if you're sure:
/*
DELETE FROM storage.objects
WHERE bucket_id = 'stories'
AND created_at < NOW() - INTERVAL '2 days';

DELETE FROM storage.objects
WHERE bucket_id = 'posts'
AND created_at < NOW() - INTERVAL '7 days';
*/

-- ========================================
-- 4. VACUUM DATABASE (Reclaim space)
-- ========================================
-- This reclaims space from deleted rows
VACUUM FULL messages;
VACUUM FULL posts;
VACUUM FULL stories;
VACUUM FULL conversations;

-- ========================================
-- 5. CHECK RESULTS
-- ========================================
-- Check new database size
SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Check tables again
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;