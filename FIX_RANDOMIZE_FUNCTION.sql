-- Fix for randomize_trios function - handles json[] to json casting error
-- Run this in Supabase SQL Editor to fix the "cannot cast type json[] to json" error

DROP FUNCTION IF EXISTS public.randomize_trios();

CREATE OR REPLACE FUNCTION public.randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_count int := 0;
  user_count int;
  user1 uuid;
  user2 uuid;
  user3 uuid;
  today date := CURRENT_DATE;
BEGIN
  -- Delete existing trios for today
  DELETE FROM public.trios WHERE date = today;
  
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
      
      -- Create trio with proper structure matching the trios table
      INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
      VALUES (user1, user2, user3, today);
      
      created_count := created_count + 1;
      i := i + 3;
    END LOOP;
    
    -- Handle remaining users (1 or 2)
    IF i = user_count THEN
      -- One user left - create solo entry
      SELECT id INTO user1 FROM temp_users WHERE row_num = i;
      INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
      VALUES (user1, NULL, NULL, today);
      created_count := created_count + 1;
    ELSIF i + 1 = user_count THEN
      -- Two users left - create duo
      SELECT id INTO user1 FROM temp_users WHERE row_num = i;
      SELECT id INTO user2 FROM temp_users WHERE row_num = i + 1;
      INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
      VALUES (user1, user2, NULL, today);
      created_count := created_count + 1;
    END IF;
  END;
  
  -- Clean up
  DROP TABLE IF EXISTS temp_users;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Created %s trios for %s users', created_count, user_count),
    'created', created_count,
    'date', today::text
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

-- Also update the delete function to match current table structure
DROP FUNCTION IF EXISTS public.delete_todays_trios();

CREATE OR REPLACE FUNCTION public.delete_todays_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
  today date := CURRENT_DATE;
BEGIN
  -- Delete trios for today
  WITH deleted AS (
    DELETE FROM public.trios 
    WHERE date = today
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Deleted %s trios for today', deleted_count),
    'deleted', deleted_count,
    'date', today::text
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

-- Test the function
SELECT randomize_trios();