-- COMPLETE DIAGNOSTIC SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor to see what's ACTUALLY happening

-- 1. What columns does trios table actually have?
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trios' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. What foreign keys exist on trios?
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'trios';

-- 3. Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'trios';

-- 4. Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'trios';

-- 5. Check if profiles exist and match auth.users
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'profiles' as table_name,
    COUNT(*) as count
FROM profiles;

-- 6. Check for profile/user mismatches
SELECT 
    u.id,
    u.email,
    p.id as profile_id,
    p.username
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id OR u.id = p.user_id
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Try to insert a trio DIRECTLY (not through function)
DO $$
DECLARE
    user1 UUID;
    user2 UUID;
    user3 UUID;
    new_trio_id UUID;
BEGIN
    -- Get 3 user IDs from PROFILES table
    SELECT id INTO user1 FROM profiles ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO user2 FROM profiles WHERE id != user1 ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO user3 FROM profiles WHERE id NOT IN (user1, user2) ORDER BY RANDOM() LIMIT 1;
    
    RAISE NOTICE 'User1: %, User2: %, User3: %', user1, user2, user3;
    
    -- Try to insert using PROFILES IDs
    BEGIN
        INSERT INTO trios (user1_id, user2_id, user3_id, date)
        VALUES (user1, user2, user3, CURRENT_DATE)
        RETURNING id INTO new_trio_id;
        
        RAISE NOTICE 'SUCCESS with profiles IDs! Trio ID: %', new_trio_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAILED with profiles IDs: %', SQLERRM;
        
        -- Now try with AUTH.USERS IDs
        SELECT id INTO user1 FROM auth.users ORDER BY RANDOM() LIMIT 1;
        SELECT id INTO user2 FROM auth.users WHERE id != user1 ORDER BY RANDOM() LIMIT 1;
        SELECT id INTO user3 FROM auth.users WHERE id NOT IN (user1, user2) ORDER BY RANDOM() LIMIT 1;
        
        RAISE NOTICE 'Trying auth.users IDs: %, %, %', user1, user2, user3;
        
        INSERT INTO trios (user1_id, user2_id, user3_id, date)
        VALUES (user1, user2, user3, CURRENT_DATE)
        RETURNING id INTO new_trio_id;
        
        RAISE NOTICE 'SUCCESS with auth.users IDs! Trio ID: %', new_trio_id;
    END;
END $$;

-- 8. Check what's in trios now
SELECT 
    id,
    date,
    user1_id,
    user2_id,
    user3_id,
    created_at
FROM trios
ORDER BY created_at DESC
LIMIT 5;

-- 9. Check the ACTUAL randomize_trios function
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'randomize_trios';

-- 10. Final test - call the function and see what happens
SELECT randomize_trios() as result;

-- 11. Did it actually create anything?
SELECT 
    COUNT(*) as trio_count,
    date
FROM trios
WHERE date = CURRENT_DATE
GROUP BY date;