-- Debug and fix the randomize function
-- Run this to see what's happening

-- First, let's test the user selection logic
SELECT ARRAY_AGG(id ORDER BY RANDOM()) as user_ids
FROM profiles 
WHERE id IS NOT NULL;

-- Check if we can get the count
SELECT COUNT(*) as total_users FROM profiles WHERE id IS NOT NULL;

-- Now let's create a working randomize function
CREATE OR REPLACE FUNCTION randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_ids UUID[];
  trio_count INT := 0;
  users_assigned INT := 0;
  i INT;
  total_users INT;
BEGIN
  -- Get count first for debugging
  SELECT COUNT(*) INTO total_users FROM profiles WHERE id IS NOT NULL;
  
  -- Archive existing active trios
  UPDATE trios 
  SET status = 'archived', 
      archived_at = NOW() 
  WHERE status = 'active' OR status IS NULL;
  
  -- Get all user IDs randomly
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) INTO user_ids
  FROM profiles 
  WHERE id IS NOT NULL;
  
  -- Create trios from groups of 3 users
  i := 1;
  WHILE i + 2 <= array_length(user_ids, 1) LOOP
    INSERT INTO trios (member1_id, member2_id, member3_id, status, created_at, date)
    VALUES (
      user_ids[i], 
      user_ids[i+1], 
      user_ids[i+2], 
      'active',
      NOW(),
      CURRENT_DATE
    );
    
    trio_count := trio_count + 1;
    users_assigned := users_assigned + 3;
    i := i + 3;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'trios_created', trio_count,
    'users_assigned', users_assigned,
    'total_users_found', total_users,
    'array_length', array_length(user_ids, 1)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'trios_created', 0,
      'users_assigned', 0,
      'total_users_found', total_users
    );
END;
$$;