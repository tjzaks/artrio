-- COMPLETE TEARDOWN AND REBUILD - FIXED VERSION
-- The problem was trying to use MAX() on UUID columns

-- ============================================
-- STEP 1: NUCLEAR DESTRUCTION
-- ============================================
DROP FUNCTION IF EXISTS public.randomize_trios() CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios(boolean) CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios_safe() CASCADE;
DROP FUNCTION IF EXISTS public.delete_todays_trios() CASCADE;

-- ============================================
-- STEP 2: BUILD NEW RANDOMIZE FUNCTION - FIXED
-- ============================================
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
  
  -- Create new trios using a simpler approach
  WITH shuffled_users AS (
    -- Get all users in random order with row numbers
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
    FROM profiles
  ),
  trio_groups AS (
    -- Group every 3 consecutive users
    SELECT 
      u1.id as user1_id,
      u2.id as user2_id,
      u3.id as user3_id
    FROM shuffled_users u1
    JOIN shuffled_users u2 ON u2.rn = u1.rn + 1
    JOIN shuffled_users u3 ON u3.rn = u1.rn + 2
    WHERE u1.rn % 3 = 1  -- Start with users at positions 1, 4, 7, etc.
      AND u3.rn <= v_trio_count * 3  -- Don't exceed our limit
  )
  INSERT INTO trios (user1_id, user2_id, user3_id, date)
  SELECT user1_id, user2_id, user3_id, CURRENT_DATE
  FROM trio_groups;
  
  -- Log what we did
  RAISE NOTICE 'Created % trios from % users', v_trio_count, v_user_count;
END;
$$;

-- ============================================
-- STEP 3: BUILD DELETE FUNCTION  
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
-- STEP 4: SET PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO anon;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO anon;
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO service_role;

-- ============================================
-- STEP 5: FORCE POSTGREST RELOAD
-- ============================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================
-- STEP 6: TEST THE FUNCTIONS
-- ============================================
-- Test delete first
SELECT delete_todays_trios();

-- Test randomize
SELECT randomize_trios();

-- Verify trios were created
SELECT COUNT(*) as trio_count FROM trios WHERE date = CURRENT_DATE;

-- Show the created trios
SELECT 
  t.*,
  p1.username as user1_name,
  p2.username as user2_name,
  p3.username as user3_name
FROM trios t
LEFT JOIN profiles p1 ON t.user1_id = p1.id
LEFT JOIN profiles p2 ON t.user2_id = p2.id
LEFT JOIN profiles p3 ON t.user3_id = p3.id
WHERE t.date = CURRENT_DATE;