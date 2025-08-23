-- DEEP PRESENCE DEBUGGING - RUN THIS NOW!
-- This checks EVERYTHING about presence

-- =====================================================
-- 1. CHECK CURRENT PRESENCE DATA
-- =====================================================
SELECT 
    '=== CURRENT USER PRESENCE STATUS ===' as section;

SELECT 
    username,
    user_id,
    is_online,
    last_seen,
    CASE 
        WHEN is_online = true AND last_seen > NOW() - INTERVAL '30 seconds' THEN '✅ ACTIVE NOW'
        WHEN is_online = true AND last_seen > NOW() - INTERVAL '2 minutes' THEN '⚠️ ONLINE BUT STALE'
        WHEN is_online = true THEN '❌ ONLINE FLAG BUT VERY STALE'
        ELSE '⚫ OFFLINE'
    END as actual_status,
    EXTRACT(EPOCH FROM (NOW() - last_seen)) as seconds_since_update
FROM profiles
WHERE username IN ('tzaks', 'tszaks', 'toby', 'Tyler')
ORDER BY is_online DESC, last_seen DESC;

-- =====================================================
-- 2. CHECK REALTIME CONFIGURATION
-- =====================================================
SELECT 
    '=== REALTIME CONFIGURATION ===' as section;

-- Check if profiles is in realtime
SELECT 
    tablename,
    'YES - Table is broadcasting changes' as realtime_status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'profiles';

-- Check what events are enabled
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL as has_using_clause,
    with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- =====================================================
-- 3. TEST UPDATE CAPABILITY
-- =====================================================
SELECT 
    '=== TESTING YOUR UPDATE CAPABILITY ===' as section;

-- Try to update your own presence
DO $$
DECLARE
    v_user_id uuid;
    v_username text;
    v_updated boolean;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ NOT AUTHENTICATED - Cannot test updates';
    ELSE
        -- Try to update
        UPDATE profiles 
        SET 
            is_online = true,
            last_seen = NOW()
        WHERE user_id = v_user_id
        RETURNING username INTO v_username;
        
        IF v_username IS NOT NULL THEN
            RAISE NOTICE '✅ UPDATE SUCCESSFUL for user: %', v_username;
        ELSE
            RAISE NOTICE '❌ UPDATE FAILED - No profile found for user_id: %', v_user_id;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 4. CHECK TRIGGER FUNCTIONALITY
-- =====================================================
SELECT 
    '=== TRIGGER STATUS ===' as section;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
AND trigger_name LIKE '%last_seen%';

-- =====================================================
-- 5. CHECK WHO'S BEEN ACTIVE RECENTLY
-- =====================================================
SELECT 
    '=== RECENT ACTIVITY (Last 5 minutes) ===' as section;

SELECT 
    username,
    is_online,
    last_seen,
    ROUND(EXTRACT(EPOCH FROM (NOW() - last_seen))/60, 1) as minutes_ago
FROM profiles
WHERE last_seen > NOW() - INTERVAL '5 minutes'
ORDER BY last_seen DESC;

-- =====================================================
-- 6. CHECK REALTIME SLOTS
-- =====================================================
SELECT 
    '=== REALTIME SLOTS USAGE ===' as section;

SELECT 
    COUNT(*) as active_realtime_connections,
    'Check if this is near your plan limit' as note
FROM pg_stat_replication;

-- =====================================================
-- 7. FINAL DIAGNOSIS
-- =====================================================
DO $$
DECLARE
    v_has_columns boolean;
    v_has_realtime boolean;
    v_can_update boolean;
    v_has_trigger boolean;
    v_recent_updates integer;
BEGIN
    -- Check columns
    SELECT COUNT(*) = 2 INTO v_has_columns
    FROM information_schema.columns
    WHERE table_name = 'profiles' 
    AND column_name IN ('is_online', 'last_seen');
    
    -- Check realtime
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) INTO v_has_realtime;
    
    -- Check if we can update
    v_can_update := auth.uid() IS NOT NULL;
    
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'profiles'
        AND trigger_name LIKE '%last_seen%'
    ) INTO v_has_trigger;
    
    -- Check recent activity
    SELECT COUNT(*) INTO v_recent_updates
    FROM profiles
    WHERE last_seen > NOW() - INTERVAL '2 minutes';
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DIAGNOSIS SUMMARY:';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Columns exist: %', CASE WHEN v_has_columns THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'Realtime enabled: %', CASE WHEN v_has_realtime THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'Can update own presence: %', CASE WHEN v_can_update THEN '✅ YES' ELSE '❌ NO (not authenticated)' END;
    RAISE NOTICE 'Trigger exists: %', CASE WHEN v_has_trigger THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'Recent updates in last 2 min: %', v_recent_updates;
    RAISE NOTICE '';
    
    IF NOT v_has_realtime THEN
        RAISE NOTICE '🚨 PROBLEM: Realtime not enabled! Run APPLY_PRESENCE_FIX_NOW.sql again';
    ELSIF v_recent_updates = 0 THEN
        RAISE NOTICE '🚨 PROBLEM: No recent updates - presence system not working';
    ELSIF NOT v_can_update THEN
        RAISE NOTICE '🚨 PROBLEM: Not authenticated - try logging in first';
    ELSE
        RAISE NOTICE '✅ Backend looks OK - check frontend/WebSocket connection';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;