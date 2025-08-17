-- Check if RLS is blocking trio creation
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled on trios table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'trios';

-- 2. Check all policies on trios table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual as "using_expression",
    with_check as "with_check_expression"
FROM pg_policies
WHERE tablename = 'trios'
ORDER BY policyname;

-- 3. TEMPORARILY disable RLS to test (BE CAREFUL!)
ALTER TABLE trios DISABLE ROW LEVEL SECURITY;

-- 4. Try the function now
SELECT randomize_trios();

-- 5. Check if trios were created
SELECT COUNT(*) as trio_count, date 
FROM trios 
GROUP BY date 
ORDER BY date DESC;

-- 6. If it worked, the issue is RLS. Create proper policies:
-- First, re-enable RLS
ALTER TABLE trios ENABLE ROW LEVEL SECURITY;

-- 7. Create a policy that allows the function to insert
CREATE POLICY "Allow system to create trios" ON trios
    FOR INSERT
    WITH CHECK (true);  -- Functions with SECURITY DEFINER bypass RLS

-- 8. Create a policy for users to read their trios
CREATE POLICY "Users can view their trios" ON trios
    FOR SELECT
    USING (
        auth.uid() IN (user1_id, user2_id, user3_id, user4_id, user5_id)
    );

-- 9. Test again with RLS enabled
SELECT randomize_trios();

-- 10. Final check
SELECT 
    COUNT(*) as count,
    date,
    string_agg(id::text, ', ') as trio_ids
FROM trios 
WHERE date = CURRENT_DATE
GROUP BY date;