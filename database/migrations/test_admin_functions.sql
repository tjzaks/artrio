-- Test script to check which admin functions exist in the database
-- Run this in Supabase SQL editor to diagnose the issue

-- Check if functions exist
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN (
    'randomize_trios',
    'delete_todays_trios',
    'cleanup_expired_content',
    'populate_safe_profiles',
    'execute_sql',
    'is_admin',
    'check_rate_limit'
)
ORDER BY p.proname;

-- Check if user_roles table exists and has admin users
SELECT 
    u.email,
    ur.user_id,
    ur.role,
    ur.created_at
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at;

-- Check if profiles table has data
SELECT COUNT(*) as profile_count FROM public.profiles;

-- Check if trios table exists
SELECT COUNT(*) as trio_count FROM public.trios WHERE date = CURRENT_DATE;

-- Test the current user's admin status (will show NULL if not authenticated via this query)
SELECT auth.uid() as current_user_id, 
       EXISTS (
           SELECT 1 FROM public.user_roles 
           WHERE user_id = auth.uid() AND role = 'admin'
       ) as is_admin;