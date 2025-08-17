-- FINAL FIX FOR RANDOMIZE_TRIOS
-- The issue: The function reports success but no trios are actually created

-- Drop the broken function
DROP FUNCTION IF EXISTS randomize_trios() CASCADE;

-- Create a working version with better error handling
CREATE OR REPLACE FUNCTION randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_ids UUID[];
  trio_count INT := 0;
  users_assigned INT := 0;
  total_users INT := 0;
  actual_trios_created INT := 0;
  i INT;
  today_date DATE := CURRENT_DATE;
  trio_id UUID;
  insert_success BOOLEAN;
BEGIN
  -- Count total profiles
  SELECT COUNT(*) INTO total_users FROM profiles WHERE id IS NOT NULL;
  
  RAISE NOTICE 'Total users found: %', total_users;
  
  IF total_users < 3 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Not enough users. Found %s users, need at least 3', total_users),
      'trios_created', 0,
      'users_assigned', 0,
      'total_users', total_users
    );
  END IF;

  -- Delete existing trios for today
  DELETE FROM trios WHERE date = today_date;
  RAISE NOTICE 'Deleted existing trios for today';
  
  -- Get all user IDs and randomize
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) 
  INTO user_ids
  FROM profiles 
  WHERE id IS NOT NULL;
  
  RAISE NOTICE 'User IDs array length: %', array_length(user_ids, 1);
  
  -- Create trios with explicit error checking
  i := 1;
  WHILE i + 2 <= array_length(user_ids, 1) LOOP
    BEGIN
      -- Generate a new UUID for the trio
      trio_id := gen_random_uuid();
      
      RAISE NOTICE 'Creating trio % with users: %, %, %', 
        trio_count + 1, user_ids[i], user_ids[i+1], user_ids[i+2];
      
      -- Insert with explicit columns
      INSERT INTO trios (
        id,
        user1_id, 
        user2_id, 
        user3_id,
        user4_id,
        user5_id,
        created_at, 
        date,
        archived_at
      )
      VALUES (
        trio_id,
        user_ids[i], 
        user_ids[i+1], 
        user_ids[i+2],
        NULL,
        NULL,
        NOW(),
        today_date,
        NULL
      );
      
      -- Check if insert was successful
      IF FOUND THEN
        trio_count := trio_count + 1;
        users_assigned := users_assigned + 3;
        RAISE NOTICE 'Successfully created trio %', trio_count;
      ELSE
        RAISE NOTICE 'Failed to create trio - no rows affected';
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating trio: %', SQLERRM;
      RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
    i := i + 3;
  END LOOP;
  
  -- Handle remaining users
  IF i + 1 = array_length(user_ids, 1) AND trio_count > 0 THEN
    -- Two users left
    UPDATE trios 
    SET user4_id = user_ids[i], user5_id = user_ids[i+1]
    WHERE id = trio_id;  -- Use the last trio_id
    users_assigned := users_assigned + 2;
    RAISE NOTICE 'Added 2 remaining users to last trio';
  ELSIF i = array_length(user_ids, 1) AND trio_count > 0 THEN
    -- One user left
    UPDATE trios 
    SET user4_id = user_ids[i]
    WHERE id = trio_id;  -- Use the last trio_id
    users_assigned := users_assigned + 1;
    RAISE NOTICE 'Added 1 remaining user to last trio';
  END IF;
  
  -- Verify actual creation
  SELECT COUNT(*) INTO actual_trios_created 
  FROM trios 
  WHERE date = today_date;
  
  RAISE NOTICE 'Actual trios in database: %', actual_trios_created;
  
  -- Return accurate result
  IF actual_trios_created > 0 THEN
    RETURN json_build_object(
      'success', true,
      'trios_created', actual_trios_created,
      'users_assigned', users_assigned,
      'total_users', total_users,
      'message', format('Successfully created %s trios', actual_trios_created)
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to create trios - check database constraints',
      'trios_created', 0,
      'users_assigned', 0,
      'total_users', total_users
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Function error: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'trios_created', 0,
      'users_assigned', 0
    );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION randomize_trios() TO authenticated;

-- Test the function
SELECT randomize_trios();

-- Verify it actually created trios
SELECT 
    id,
    date,
    user1_id,
    user2_id,
    user3_id,
    user4_id,
    user5_id
FROM trios 
WHERE date = CURRENT_DATE;