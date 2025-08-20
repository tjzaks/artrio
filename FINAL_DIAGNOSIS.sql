-- Final diagnosis - let's see EXACTLY what PostgREST exposes

-- 1. Check ALL functions named randomize_trios in ANY schema
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  p.oid,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prorettype::regtype as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE LOWER(p.proname) LIKE '%randomize%trios%'
ORDER BY n.nspname, p.proname;

-- 2. Check if there's any conflicting schema in search_path
SHOW search_path;

-- 3. Check current user and their permissions
SELECT current_user, current_role;

-- 4. Check the EXACT permissions on the function
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name = 'randomize_trios'
  AND routine_schema = 'public';

-- 5. Try calling with explicit schema
SELECT public.randomize_trios() AS explicit_call;

-- 6. Check if PostgREST can see it
SELECT 
  routine_schema,
  routine_name,
  data_type
FROM information_schema.routines
WHERE routine_name = 'randomize_trios'
AND routine_schema IN (SELECT unnest(string_to_array(current_setting('search_path'), ', ')));