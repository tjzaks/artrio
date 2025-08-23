-- Check current presence status for all users
SELECT 
    user_id,
    username,
    is_online,
    last_seen,
    CASE 
        WHEN is_online = true THEN 'Online'
        WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 'Recently active'
        ELSE 'Offline'
    END as status,
    NOW() - last_seen::timestamp as time_since_last_seen
FROM profiles
ORDER BY is_online DESC, last_seen DESC;

-- Check if presence columns exist and have proper types
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('is_online', 'last_seen');

-- Check for any RLS policies that might block presence updates
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
WHERE tablename = 'profiles'
AND (qual LIKE '%is_online%' OR qual LIKE '%last_seen%' OR with_check LIKE '%is_online%' OR with_check LIKE '%last_seen%');