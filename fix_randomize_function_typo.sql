-- Drop the existing function first to ensure clean recreation
DROP FUNCTION IF EXISTS public.randomize_trios();

-- Create the corrected randomize_trios function
CREATE OR REPLACE FUNCTION public.randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  today date := CURRENT_DATE;
  user_count int;
  created_count int := 0;
BEGIN
  -- Delete existing trios for today
  DELETE FROM public.trios WHERE date = today;
  
  -- Get all active users
  DROP TABLE IF EXISTS temp_users;
  CREATE TEMP TABLE temp_users AS
  SELECT id, username 
  FROM public.profiles 
  WHERE id IS NOT NULL
  ORDER BY RANDOM();
  
  -- Get count of available users
  SELECT COUNT(*) INTO user_count FROM temp_users;
  
  -- Need at least 3 users
  IF user_count < 3 THEN
    DROP TABLE IF EXISTS temp_users;
    RETURN json_build_object(
      'success', false,
      'message', 'Not enough users for trios (need at least 3, have ' || user_count || ')',
      'created', 0
    );
  END IF;
  
  -- Create trios with users in groups of 3
  WHILE (SELECT COUNT(*) FROM temp_users) >= 3 LOOP
    DECLARE
      user1 uuid;
      user2 uuid;
      user3 uuid;
    BEGIN
      -- Get 3 users
      SELECT id INTO user1 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user1;
      
      SELECT id INTO user2 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user2;
      
      SELECT id INTO user3 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user3;
      
      -- Create the trio
      INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
      VALUES (user1, user2, user3, today);
      
      created_count := created_count + 1;
    END;
  END LOOP;
  
  -- Handle remaining users (1 or 2 left over)
  DECLARE
    remaining_count int;
    user1 uuid;
    user2 uuid;
  BEGIN
    SELECT COUNT(*) INTO remaining_count FROM temp_users;
    
    IF remaining_count = 2 THEN
      -- Create a duo
      SELECT id INTO user1 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user1;
      
      SELECT id INTO user2 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user2;
      
      INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
      VALUES (user1, user2, NULL, today);
      
      created_count := created_count + 1;
    ELSIF remaining_count = 1 THEN
      -- Single user - add to a solo "trio"
      SELECT id INTO user1 FROM temp_users LIMIT 1;
      
      INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
      VALUES (user1, NULL, NULL, today);
      
      created_count := created_count + 1;
    END IF;
  END;
  
  -- Clean up
  DROP TABLE IF EXISTS temp_users;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Created ' || created_count || ' trios for ' || user_count || ' users',
    'created', created_count,
    'date', today::text
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Clean up on error
    DROP TABLE IF EXISTS temp_users;
    RETURN json_build_object(
      'success', false,
      'message', 'Error: ' || SQLERRM,
      'created', 0
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO anon;

-- Test the function
SELECT public.randomize_trios() as test_result;