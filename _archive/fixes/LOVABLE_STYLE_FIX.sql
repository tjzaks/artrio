-- Lovable-style fix: Simple, direct, works immediately
-- This is how Lovable would build it - no overthinking

CREATE OR REPLACE FUNCTION randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  trio_count int := 0;
  users_assigned int := 0;
BEGIN
  -- Delete today's trios first (clean slate)
  DELETE FROM trios WHERE date = CURRENT_DATE;
  
  -- Create new trios using a simple INSERT with subquery
  WITH shuffled_users AS (
    SELECT id, row_number() OVER (ORDER BY RANDOM()) as rn
    FROM profiles
  ),
  grouped_users AS (
    SELECT 
      id,
      ((rn - 1) / 3) + 1 as trio_group,
      ((rn - 1) % 3) + 1 as position_in_trio
    FROM shuffled_users
  )
  INSERT INTO trios (user1_id, user2_id, user3_id, date)
  SELECT 
    MAX(CASE WHEN position_in_trio = 1 THEN id END) as user1_id,
    MAX(CASE WHEN position_in_trio = 2 THEN id END) as user2_id,
    MAX(CASE WHEN position_in_trio = 3 THEN id END) as user3_id,
    CURRENT_DATE
  FROM grouped_users
  GROUP BY trio_group
  HAVING COUNT(*) = 3;
  
  -- Get the counts
  SELECT COUNT(*) INTO trio_count FROM trios WHERE date = CURRENT_DATE;
  
  -- Count users assigned (trios * 3)
  users_assigned := trio_count * 3;
  
  -- Return simple success
  RETURN json_build_object(
    'success', true,
    'trios_created', trio_count,
    'users_assigned', users_assigned,
    'total_users', (SELECT COUNT(*) FROM profiles)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION randomize_trios() TO authenticated;