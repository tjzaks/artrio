-- CHECK YOUR SUPABASE REALTIME LIMITS

-- Check current connections
SELECT 
    '=== CURRENT REALTIME USAGE ===' as info;

SELECT 
    COUNT(*) as active_connections,
    CASE 
        WHEN COUNT(*) <= 2 THEN 'Free tier (2 max)'
        WHEN COUNT(*) <= 50 THEN 'Pro tier (50 max)'
        WHEN COUNT(*) <= 500 THEN 'Team tier (500 max)'
        ELSE 'Enterprise'
    END as likely_plan
FROM pg_stat_replication;

-- Check how many users are trying to use realtime
SELECT 
    '=== USERS ACTIVE IN LAST 10 MINUTES ===' as info;

SELECT 
    COUNT(DISTINCT user_id) as unique_users_recently_active,
    COUNT(*) as total_presence_updates
FROM profiles
WHERE last_seen > NOW() - INTERVAL '10 minutes';

-- Show who's been trying to connect
SELECT 
    username,
    is_online,
    last_seen,
    ROUND(EXTRACT(EPOCH FROM (NOW() - last_seen))/60, 1) as minutes_since_update
FROM profiles
WHERE last_seen > NOW() - INTERVAL '10 minutes'
ORDER BY last_seen DESC;

-- DIAGNOSIS
DO $$
DECLARE
    v_connections integer;
    v_active_users integer;
BEGIN
    SELECT COUNT(*) INTO v_connections FROM pg_stat_replication;
    
    SELECT COUNT(DISTINCT user_id) INTO v_active_users
    FROM profiles
    WHERE last_seen > NOW() - INTERVAL '10 minutes';
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'REALTIME CONNECTION DIAGNOSIS:';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Current connections: %', v_connections;
    RAISE NOTICE 'Users trying to connect: %', v_active_users;
    RAISE NOTICE '';
    
    IF v_connections <= 2 AND v_active_users > 2 THEN
        RAISE NOTICE '🚨 PROBLEM: FREE TIER LIMIT!';
        RAISE NOTICE 'You have % users but only 2 connection slots', v_active_users;
        RAISE NOTICE 'SOLUTION: Upgrade to Supabase Pro ($25/mo) for 500 connections';
    ELSIF v_connections >= 50 AND v_active_users > 50 THEN
        RAISE NOTICE '🚨 PROBLEM: PRO TIER LIMIT!';
        RAISE NOTICE 'You have % users but only 50-500 connection slots', v_active_users;
    ELSE
        RAISE NOTICE '✅ Connection limit OK';
        RAISE NOTICE 'Issue might be too many channels per user';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;