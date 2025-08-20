-- COMPLETE TEARDOWN AND REBUILD OF TRIO RANDOMIZATION
-- No more patches, no more workarounds. Clean slate.

-- ============================================
-- STEP 1: NUCLEAR DESTRUCTION
-- ============================================
-- Drop EVERYTHING related to randomize_trios
DROP FUNCTION IF EXISTS public.randomize_trios() CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios(boolean) CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios_safe() CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios(json) CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios(text) CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios(integer) CASCADE;

-- Drop delete function too for good measure
DROP FUNCTION IF EXISTS public.delete_todays_trios() CASCADE;

-- ============================================
-- STEP 2: VERIFY CLEAN SLATE
-- ============================================
-- This should return ZERO rows
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prorettype::regtype as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%randomize%'
   OR p.proname LIKE '%trio%';

-- ============================================
-- STEP 3: BUILD NEW RANDOMIZE FUNCTION
-- ============================================
-- Simple, clean, returns NOTHING
CREATE OR REPLACE FUNCTION public.randomize_trios()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count integer;
  v_trio_count integer;
BEGIN
  -- Get total users
  SELECT COUNT(*) INTO v_user_count FROM profiles;
  
  -- If we have less than 3 users, can't make trios
  IF v_user_count < 3 THEN
    RAISE NOTICE 'Not enough users to create trios (need at least 3, have %)', v_user_count;
    RETURN;
  END IF;
  
  -- Calculate how many complete trios we can make
  v_trio_count := v_user_count / 3;
  
  -- Clear existing trios for today
  DELETE FROM trios WHERE date = CURRENT_DATE;
  
  -- Create new trios
  WITH shuffled_users AS (
    -- Randomly order all users
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY RANDOM()) as position
    FROM profiles
    ORDER BY position
    LIMIT (v_trio_count * 3)  -- Only take enough users for complete trios
  ),
  grouped_users AS (
    -- Group them into sets of 3
    SELECT 
      id,
      position,
      ((position - 1) / 3) + 1 as trio_number,
      ((position - 1) % 3) + 1 as position_in_trio
    FROM shuffled_users
  )
  -- Insert the trios
  INSERT INTO trios (user1_id, user2_id, user3_id, date)
  SELECT 
    MAX(CASE WHEN position_in_trio = 1 THEN id END) as user1_id,
    MAX(CASE WHEN position_in_trio = 2 THEN id END) as user2_id,
    MAX(CASE WHEN position_in_trio = 3 THEN id END) as user3_id,
    CURRENT_DATE
  FROM grouped_users
  GROUP BY trio_number;
  
  -- Log what we did
  RAISE NOTICE 'Created % trios from % users', v_trio_count, v_user_count;
END;
$$;

-- ============================================
-- STEP 4: BUILD DELETE FUNCTION  
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_todays_trios()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM trios WHERE date = CURRENT_DATE;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % trios for today', v_deleted_count;
END;
$$;

-- ============================================
-- STEP 5: SET PERMISSIONS
-- ============================================
-- Grant to all relevant roles
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO anon;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO anon;
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO service_role;

-- ============================================
-- STEP 6: FORCE POSTGREST RELOAD
-- ============================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================
-- STEP 7: TEST THE FUNCTIONS
-- ============================================
-- Test delete first
SELECT delete_todays_trios();

-- Test randomize
SELECT randomize_trios();

-- Verify trios were created
SELECT COUNT(*) as trio_count FROM trios WHERE date = CURRENT_DATE;

-- ============================================
-- STEP 8: VERIFY FUNCTIONS EXIST
-- ============================================
SELECT 
  routine_schema,
  routine_name,
  data_type
FROM information_schema.routines
WHERE routine_name IN ('randomize_trios', 'delete_todays_trios')
AND routine_schema = 'public';