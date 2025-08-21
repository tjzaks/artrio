-- Diagnose posts table issue
-- Run each query separately to understand what's happening

-- 1. Check the actual table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'posts'
ORDER BY ordinal_position;

-- 2. Try a different way to see columns
\d posts

-- 3. Check if there are multiple posts tables in different schemas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'posts';

-- 4. Test if we can actually insert with media columns
-- Replace the UUIDs with valid ones from your database
INSERT INTO posts (user_id, trio_id, content, media_url, media_type)
VALUES (
    auth.uid(), -- current user
    (SELECT id FROM trios WHERE date = CURRENT_DATE LIMIT 1), -- today's trio
    'Test post with media',
    'https://example.com/test.jpg',
    'image'
);

-- 5. Check current RLS policies
SELECT 
    polname as policy_name,
    polcmd as command,
    pg_get_expr(polqual, polrelid) as using_expression,
    pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
WHERE polrelid = 'public.posts'::regclass;

-- 6. Make content nullable if not already
ALTER TABLE posts 
ALTER COLUMN content DROP NOT NULL;

-- 7. Recreate the insert policy to be super permissive
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can create own posts" ON posts;

CREATE POLICY "Users can insert posts" ON posts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 8. Grant all permissions
GRANT ALL ON posts TO authenticated;
GRANT ALL ON posts TO anon;

-- 9. Disable RLS temporarily to test
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable with:
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;