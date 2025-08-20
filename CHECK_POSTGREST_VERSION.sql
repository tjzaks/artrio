-- Check PostgREST version and settings
SELECT 
  current_setting('server_version') as postgres_version,
  current_setting('server_version_num') as postgres_version_num;

-- Check if the function is accessible via PostgREST
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  p.prokind,
  p.provolatile,
  p.proisstrict,
  p.prosecdef,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'randomize_trios'
AND n.nspname = 'public';

-- Force PostgREST to see the function
ALTER FUNCTION public.randomize_trios() SECURITY DEFINER;
ALTER FUNCTION public.randomize_trios() VOLATILE;

-- Grant explicit permissions again
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO postgres;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO anon;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO service_role;

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Test it
SELECT randomize_trios();