-- Let's find the REAL problem - why is json[] being returned?

-- 1. Check if there are any triggers or rules modifying the function output
SELECT 
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid, true) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'trios';

-- 2. Check the EXACT function definition as stored
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'randomize_trios'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. Check if there's a VIEW or other object with the same name
SELECT 
  n.nspname as schema_name,
  c.relname as object_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    WHEN 'f' THEN 'foreign table'
    WHEN 'p' THEN 'partitioned table'
  END as object_type
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'randomize_trios';

-- 4. Test calling the function directly with different methods
DO $$
DECLARE
  result1 json;
  result2 text;
  result3 jsonb;
BEGIN
  -- Method 1: Direct assignment
  result1 := randomize_trios();
  RAISE NOTICE 'Direct assignment result type: %, value: %', pg_typeof(result1), result1;
  
  -- Method 2: Select into
  SELECT randomize_trios() INTO result1;
  RAISE NOTICE 'Select into result type: %, value: %', pg_typeof(result1), result1;
  
  -- Method 3: Cast explicitly
  result2 := randomize_trios()::text;
  RAISE NOTICE 'Text cast result: %', result2;
END $$;

-- 5. Check PostgREST schema cache
SELECT 
  n.nspname,
  p.proname,
  p.proargtypes,
  p.prorettype::regtype,
  p.proretset,
  p.provolatile
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'randomize_trios'
  AND n.nspname = ANY(current_schemas(false));

-- 6. Check if there's an issue with how Supabase generates the RPC
-- This shows what PostgREST sees
SELECT 
  routine_name,
  data_type,
  type_udt_name
FROM information_schema.routines
WHERE routine_name = 'randomize_trios'
  AND routine_schema = 'public';