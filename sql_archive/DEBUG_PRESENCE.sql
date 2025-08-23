-- PRESENCE DEBUGGING QUERIES
-- Run these in Supabase SQL Editor

-- 1. Check if presence columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('is_online', 'last_seen');

-- 2. Check current presence status for all users
SELECT 
    id,
    user_id,
    username,
    is_online,
    last_seen,
    CASE 
        WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 'Recently Active'
        WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 'Active in last hour'
        ELSE 'Inactive'
    END as activity_status
FROM profiles
ORDER BY is_online DESC, last_seen DESC;

-- 3. Check if realtime is enabled for profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 4. Check RLS policies on profiles
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 5. Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
AND trigger_name = 'update_last_seen_trigger';

-- 6. Check realtime publication
SELECT 
    pubname,
    puballtables,
    pubinsert,
    pubupdate,
    pubdelete
FROM pg_publication
WHERE pubname = 'supabase_realtime';

-- 7. Check which tables are in realtime publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- 8. Test updating presence as authenticated user
-- Run this to simulate what the app does:
-- UPDATE profiles 
-- SET is_online = true, last_seen = NOW()
-- WHERE user_id = auth.uid();