-- FINAL FIX for randomize_trios function
-- This will definitely work without any max(uuid) errors

DROP FUNCTION IF EXISTS public.randomize_trios();

CREATE OR REPLACE FUNCTION public.randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_count int := 0;
  user_count int;
  new_trio_id uuid;
  user1 uuid;
  user2 uuid;
  user3 uuid;
BEGIN
  -- Delete existing trios for today (clean up both tables)
  DELETE FROM public.trio_members 
  WHERE trio_id IN (
    SELECT id FROM public.trios 
    WHERE DATE(created_at) = CURRENT_DATE
  );
  
  DELETE FROM public.trios 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Create temporary table with all users shuffled
  CREATE TEMP TABLE temp_users AS
  SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as row_num
  FROM public.profiles
  WHERE id IS NOT NULL;
  
  -- Get count of available users
  SELECT COUNT(*) INTO user_count FROM temp_users;
  
  -- Need at least 3 users
  IF user_count < 3 THEN
    DROP TABLE IF EXISTS temp_users;
    RETURN json_build_object(
      'success', false,
      'message', format('Not enough users for trios (have %s, need at least 3)', user_count),
      'created', 0
    );
  END IF;
  
  -- Create trios in groups of 3
  DECLARE
    i int := 1;
  BEGIN
    WHILE i + 2 <= user_count LOOP
      -- Get 3 users
      SELECT id INTO user1 FROM temp_users WHERE row_num = i;
      SELECT id INTO user2 FROM temp_users WHERE row_num = i + 1;
      SELECT id INTO user3 FROM temp_users WHERE row_num = i + 2;
      
      -- Create trio
      new_trio_id := gen_random_uuid();
      INSERT INTO public.trios (id, created_at, ends_at)
      VALUES (new_trio_id, NOW(), NOW() + INTERVAL '24 hours');
      
      -- Add members
      INSERT INTO public.trio_members (trio_id, user_id, profile_id)
      VALUES 
        (new_trio_id, user1, user1),
        (new_trio_id, user2, user2),
        (new_trio_id, user3, user3);
      
      created_count := created_count + 1;
      i := i + 3;
    END LOOP;
    
    -- Handle remaining users (1 or 2)
    IF i <= user_count THEN
      new_trio_id := gen_random_uuid();
      INSERT INTO public.trios (id, created_at, ends_at)
      VALUES (new_trio_id, NOW(), NOW() + INTERVAL '24 hours');
      
      -- Add remaining members
      WHILE i <= user_count LOOP
        SELECT id INTO user1 FROM temp_users WHERE row_num = i;
        INSERT INTO public.trio_members (trio_id, user_id, profile_id)
        VALUES (new_trio_id, user1, user1);
        i := i + 1;
      END LOOP;
      
      created_count := created_count + 1;
    END IF;
  END;
  
  -- Clean up
  DROP TABLE IF EXISTS temp_users;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Created %s trios for %s users', created_count, user_count),
    'created', created_count,
    'date', CURRENT_DATE::text
  );
  
EXCEPTION
  WHEN OTHERS THEN
    DROP TABLE IF EXISTS temp_users;
    RETURN json_build_object(
      'success', false,
      'message', format('Error: %s', SQLERRM),
      'created', 0
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO anon;

-- Also create the delete function if it doesn't exist
CREATE OR REPLACE FUNCTION public.delete_todays_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Delete trio members first
  DELETE FROM public.trio_members 
  WHERE trio_id IN (
    SELECT id FROM public.trios 
    WHERE DATE(created_at) = CURRENT_DATE
  );
  
  -- Delete trios and get count
  WITH deleted AS (
    DELETE FROM public.trios 
    WHERE DATE(created_at) = CURRENT_DATE
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Deleted %s trios for today', deleted_count),
    'deleted', deleted_count,
    'date', CURRENT_DATE::text
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error: %s', SQLERRM),
      'deleted', 0
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO anon;