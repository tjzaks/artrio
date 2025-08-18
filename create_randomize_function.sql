-- Create the randomize_trios function for local development
CREATE OR REPLACE FUNCTION public.randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  today date := CURRENT_DATE;
  user_count int;
  trio_count int;
  created_count int := 0;
BEGIN
  -- Delete existing trios for today
  DELETE FROM public.trios WHERE date = today;
  
  -- Get all active users (excluding any that might be deactivated)
  CREATE TEMP TABLE IF NOT EXISTS temp_users AS
  SELECT id, username 
  FROM public.profiles 
  WHERE id IS NOT NULL
  ORDER BY RANDOM();
  
  -- Get count of available users
  SELECT COUNT(*) INTO user_count FROM temp_users;
  
  -- Calculate how many trios we can make (groups of 3-5)
  IF user_count < 3 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Not enough users for trios (need at least 3)',
      'created', 0
    );
  END IF;
  
  -- Create trios with users in groups of 3-5
  WHILE (SELECT COUNT(*) FROM temp_users) >= 3 LOOP
    DECLARE
      user1 uuid;
      user2 uuid;
      user3 uuid;
      user4 uuid;
      user5 uuid;
      remaining int;
    BEGIN
      SELECT COUNT(*) INTO remaining FROM temp_users;
      
      -- Determine trio size based on remaining users
      IF remaining >= 5 AND remaining != 6 AND remaining != 7 THEN
        -- Make a group of 5
        SELECT id INTO user1 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user1;
        
        SELECT id INTO user2 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user2;
        
        SELECT id INTO user3 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user3;
        
        SELECT id INTO user4 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user4;
        
        SELECT id INTO user5 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user5;
        
        INSERT INTO public.trios (user1_id, user2_id, user3_id, user4_id, user5_id, date)
        VALUES (user1, user2, user3, user4, user5, today);
        
      ELSIF remaining >= 4 AND remaining != 5 THEN
        -- Make a group of 4
        SELECT id INTO user1 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user1;
        
        SELECT id INTO user2 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user2;
        
        SELECT id INTO user3 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user3;
        
        SELECT id INTO user4 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user4;
        
        INSERT INTO public.trios (user1_id, user2_id, user3_id, user4_id, date)
        VALUES (user1, user2, user3, user4, today);
        
      ELSIF remaining >= 3 THEN
        -- Make a group of 3
        SELECT id INTO user1 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user1;
        
        SELECT id INTO user2 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user2;
        
        SELECT id INTO user3 FROM temp_users LIMIT 1;
        DELETE FROM temp_users WHERE id = user3;
        
        INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
        VALUES (user1, user2, user3, today);
      END IF;
      
      created_count := created_count + 1;
    END;
  END LOOP;
  
  -- Clean up temp table
  DROP TABLE IF EXISTS temp_users;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'message', format('Created %s trios for %s users', created_count, user_count),
    'created', created_count,
    'date', today
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO anon;

-- Also create the delete_todays_trios function if it doesn't exist
CREATE OR REPLACE FUNCTION public.delete_todays_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.trios WHERE date = CURRENT_DATE;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Deleted %s trios', deleted_count),
    'deleted', deleted_count
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO anon;