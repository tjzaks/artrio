-- Debug why trios aren't being created
-- Run this in Supabase SQL Editor

-- 1. Check the trios table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trios'
ORDER BY ordinal_position;

-- 2. Check for any constraints
SELECT 
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'trios';

-- 3. Try to manually insert a trio
DO $$
DECLARE
    user1 UUID;
    user2 UUID;
    user3 UUID;
    result_text TEXT;
BEGIN
    -- Get 3 random user IDs
    SELECT id INTO user1 FROM profiles ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO user2 FROM profiles WHERE id != user1 ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO user3 FROM profiles WHERE id NOT IN (user1, user2) ORDER BY RANDOM() LIMIT 1;
    
    RAISE NOTICE 'Attempting to create trio with users: %, %, %', user1, user2, user3;
    
    -- Try to insert
    BEGIN
        INSERT INTO trios (user1_id, user2_id, user3_id, date, created_at)
        VALUES (user1, user2, user3, CURRENT_DATE, NOW());
        
        RAISE NOTICE 'SUCCESS: Trio created!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: %', SQLERRM;
        RAISE NOTICE 'DETAIL: %', SQLSTATE;
    END;
END $$;

-- 4. Check if anything was inserted
SELECT * FROM trios WHERE date = CURRENT_DATE;

-- 5. Check for triggers that might be deleting
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'trios';

-- 6. Check for RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'trios';