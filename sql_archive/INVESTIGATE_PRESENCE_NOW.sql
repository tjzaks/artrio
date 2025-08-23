-- PRESENCE INVESTIGATION - RUN THIS IN SUPABASE SQL EDITOR
-- Copy this ENTIRE file and run it to see what's wrong

-- =====================================================
-- STEP 1: CHECK IF COLUMNS EXIST
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========== CHECKING PRESENCE COLUMNS ==========';
END $$;

SELECT 
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ COLUMNS EXIST: is_online and last_seen are present'
        WHEN COUNT(*) = 1 THEN '⚠️  PARTIAL: Only ' || string_agg(column_name, ', ') || ' exists'
        ELSE '❌ MISSING: No presence columns found!'
    END as column_status
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('is_online', 'last_seen');

-- =====================================================
-- STEP 2: CHECK REALTIME PUBLICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========== CHECKING REALTIME ==========';
END $$;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'profiles'
        ) THEN '✅ REALTIME ENABLED: profiles table is in realtime publication'
        ELSE '❌ REALTIME DISABLED: profiles NOT in realtime publication!'
    END as realtime_status;

-- =====================================================
-- STEP 3: CHECK RLS POLICIES
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========== CHECKING RLS POLICIES ==========';
END $$;

SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' AND qual = 'true' THEN '✅ OK - Anyone can read'
        WHEN cmd = 'UPDATE' AND qual LIKE '%auth.uid()%' THEN '✅ OK - Users can update own profile'
        WHEN cmd = 'INSERT' AND with_check LIKE '%auth.uid()%' THEN '✅ OK - Users can insert own profile'
        ELSE '⚠️  CHECK THIS'
    END as status
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- Count critical policies
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ POLICIES OK: Found ' || COUNT(*) || ' policies'
        ELSE '❌ MISSING POLICIES: Only ' || COUNT(*) || ' policies found (need at least 3)'
    END as policy_count
FROM pg_policies 
WHERE tablename = 'profiles';

-- =====================================================
-- STEP 4: CHECK TRIGGER
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========== CHECKING TRIGGER ==========';
END $$;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE event_object_table = 'profiles'
            AND trigger_name = 'update_last_seen_trigger'
        ) THEN '✅ TRIGGER EXISTS: update_last_seen_trigger is present'
        ELSE '❌ TRIGGER MISSING: No update_last_seen_trigger found!'
    END as trigger_status;

-- =====================================================
-- STEP 5: CHECK CURRENT USER STATUSES
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========== CURRENT USER STATUS ==========';
END $$;

SELECT 
    username,
    is_online,
    CASE 
        WHEN is_online = true THEN '🟢 ONLINE'
        ELSE '⚫ OFFLINE'
    END as status,
    CASE 
        WHEN last_seen IS NULL THEN 'Never'
        WHEN last_seen > NOW() - INTERVAL '1 minute' THEN 'Just now'
        WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN round(EXTRACT(EPOCH FROM (NOW() - last_seen))/60) || ' min ago'
        WHEN last_seen > NOW() - INTERVAL '1 hour' THEN round(EXTRACT(EPOCH FROM (NOW() - last_seen))/60) || ' min ago'
        ELSE to_char(last_seen, 'HH24:MI DD Mon')
    END as last_activity
FROM profiles
ORDER BY is_online DESC, last_seen DESC NULLS LAST
LIMIT 10;

-- =====================================================
-- STEP 6: TEST UPDATE CAPABILITY
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========== TESTING UPDATE CAPABILITY ==========';
END $$;

-- First, show current status of a test user
SELECT 
    '📝 BEFORE TEST:' as phase,
    username,
    is_online,
    last_seen
FROM profiles
WHERE user_id = auth.uid();

-- Try to update (this simulates what the app does)
UPDATE profiles 
SET is_online = true, last_seen = NOW()
WHERE user_id = auth.uid()
RETURNING 
    '✅ UPDATE SUCCESSFUL:' as result,
    username,
    is_online,
    last_seen;

-- If no rows returned above, the update failed
SELECT 
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ AUTH FAILED: You are not authenticated!'
        WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid()) THEN '❌ NO PROFILE: No profile exists for your user!'
        ELSE '❌ UPDATE BLOCKED: RLS policies may be preventing updates'
    END as error_diagnosis
WHERE NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_online = true 
    AND last_seen > NOW() - INTERVAL '10 seconds'
);

-- =====================================================
-- STEP 7: FINAL DIAGNOSIS
-- =====================================================
DO $$
DECLARE
    has_columns BOOLEAN;
    has_realtime BOOLEAN;
    has_policies BOOLEAN;
    has_trigger BOOLEAN;
    can_update BOOLEAN;
BEGIN
    -- Check each component
    SELECT COUNT(*) = 2 INTO has_columns
    FROM information_schema.columns
    WHERE table_name = 'profiles' 
    AND column_name IN ('is_online', 'last_seen');
    
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) INTO has_realtime;
    
    SELECT COUNT(*) >= 3 INTO has_policies
    FROM pg_policies 
    WHERE tablename = 'profiles';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'profiles'
        AND trigger_name = 'update_last_seen_trigger'
    ) INTO has_trigger;
    
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND is_online = true 
        AND last_seen > NOW() - INTERVAL '10 seconds'
    ) INTO can_update;
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FINAL DIAGNOSIS:';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Columns exist: %', CASE WHEN has_columns THEN '✅ YES' ELSE '❌ NO - RUN FIX' END;
    RAISE NOTICE 'Realtime enabled: %', CASE WHEN has_realtime THEN '✅ YES' ELSE '❌ NO - RUN FIX' END;
    RAISE NOTICE 'RLS policies exist: %', CASE WHEN has_policies THEN '✅ YES' ELSE '❌ NO - RUN FIX' END;
    RAISE NOTICE 'Trigger exists: %', CASE WHEN has_trigger THEN '✅ YES' ELSE '❌ NO - RUN FIX' END;
    RAISE NOTICE 'Can update own presence: %', CASE WHEN can_update THEN '✅ YES' ELSE '❌ NO - CHECK AUTH' END;
    RAISE NOTICE '';
    
    IF NOT has_columns OR NOT has_realtime OR NOT has_policies OR NOT has_trigger THEN
        RAISE NOTICE '🚨 ACTION REQUIRED: Run APPLY_PRESENCE_FIX_NOW.sql';
    ELSIF NOT can_update THEN
        RAISE NOTICE '🚨 AUTH ISSUE: Check if you are logged in when testing';
    ELSE
        RAISE NOTICE '✅ BACKEND IS READY - Check frontend code';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;