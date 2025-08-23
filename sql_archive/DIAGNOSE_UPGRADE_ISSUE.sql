-- DIAGNOSE WHY SUPABASE UPGRADE BROKE PRESENCE
-- Run this to find out what's different after upgrade

-- =====================================================
-- 1. CHECK IF REALTIME IS ACTUALLY ENABLED
-- =====================================================
SELECT 
    '=== IS REALTIME ENABLED FOR YOUR PROJECT? ===' as check;

-- Check if the realtime publication exists at all
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
        THEN '✅ Realtime publication EXISTS'
        ELSE '❌ REALTIME IS COMPLETELY DISABLED!'
    END as realtime_status;

-- Check what tables are in realtime (if any)
SELECT 
    '=== TABLES WITH REALTIME ENABLED ===' as check;

SELECT 
    schemaname,
    tablename,
    'Enabled for realtime' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- =====================================================
-- 2. CHECK CONNECTION POOLING MODE
-- =====================================================
SELECT 
    '=== CONNECTION MODE CHECK ===' as check;

SELECT 
    current_database() as database_name,
    current_setting('server_version') as postgres_version,
    CASE 
        WHEN current_database() LIKE '%6543%' THEN 'POOLER MODE (Transaction)'
        WHEN current_database() LIKE '%5432%' THEN 'SESSION MODE (Direct)'
        ELSE 'UNKNOWN MODE'
    END as connection_mode,
    '⚠️ Realtime requires SESSION mode (port 5432)!' as important_note;

-- =====================================================
-- 3. CHECK REALTIME SETTINGS
-- =====================================================
SELECT 
    '=== REALTIME CONFIGURATION ===' as check;

-- Check if replica identity is set correctly
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_class 
            WHERE relname = tablename 
            AND relreplident = 'f'
        ) THEN '✅ FULL replica identity'
        ELSE '❌ Missing FULL replica identity'
    END as replica_identity
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename = 'profiles';

-- =====================================================
-- 4. CHECK MAX CONNECTIONS
-- =====================================================
SELECT 
    '=== CONNECTION LIMITS ===' as check;

SELECT 
    setting as max_connections,
    CASE 
        WHEN setting::int >= 500 THEN '✅ Pro/Team plan confirmed'
        WHEN setting::int >= 50 THEN '⚠️ Starter plan'
        WHEN setting::int <= 20 THEN '❌ Free plan limits!'
        ELSE 'Check with Supabase'
    END as plan_tier
FROM pg_settings 
WHERE name = 'max_connections';

-- =====================================================
-- 5. TEST REALTIME FUNCTIONALITY
-- =====================================================
SELECT 
    '=== TESTING REALTIME ===' as check;

-- Try to send a realtime notification
DO $$
BEGIN
    -- Try to update a profile to trigger realtime
    UPDATE profiles 
    SET last_seen = NOW()
    WHERE user_id = auth.uid();
    
    RAISE NOTICE '✅ Update executed - check if clients receive it';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Update failed: %', SQLERRM;
END $$;

-- =====================================================
-- 6. FINAL DIAGNOSIS
-- =====================================================
DO $$
DECLARE
    v_realtime_exists boolean;
    v_profiles_in_realtime boolean;
    v_max_connections integer;
BEGIN
    -- Check if realtime publication exists
    SELECT EXISTS (
        SELECT 1 FROM pg_publication 
        WHERE pubname = 'supabase_realtime'
    ) INTO v_realtime_exists;
    
    -- Check if profiles is in realtime
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) INTO v_profiles_in_realtime;
    
    -- Get max connections
    SELECT setting::int INTO v_max_connections
    FROM pg_settings 
    WHERE name = 'max_connections';
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'UPGRADE ISSUE DIAGNOSIS:';
    RAISE NOTICE '==========================================';
    
    IF NOT v_realtime_exists THEN
        RAISE NOTICE '🚨 CRITICAL: REALTIME IS COMPLETELY DISABLED!';
        RAISE NOTICE 'This happens on Pro plans by default!';
        RAISE NOTICE '';
        RAISE NOTICE 'FIX: Go to Supabase Dashboard > Settings > Realtime';
        RAISE NOTICE 'Enable "Realtime" toggle and restart project';
    ELSIF NOT v_profiles_in_realtime THEN
        RAISE NOTICE '🚨 PROBLEM: Profiles table not in realtime!';
        RAISE NOTICE 'The upgrade reset your realtime tables!';
        RAISE NOTICE '';
        RAISE NOTICE 'FIX: Run APPLY_PRESENCE_FIX_NOW.sql again';
    ELSIF v_max_connections < 50 THEN
        RAISE NOTICE '⚠️ WARNING: Still showing free tier limits';
        RAISE NOTICE 'Your upgrade might not be active yet';
    ELSE
        RAISE NOTICE '✅ Backend configuration looks OK';
        RAISE NOTICE 'Check your connection string:';
        RAISE NOTICE '- Use port 5432 (not 6543) for realtime';
        RAISE NOTICE '- Use session mode (not pooler mode)';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;