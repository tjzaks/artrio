-- Fix for missing 'date' column in trios table
-- This adds the date column if it doesn't exist

-- First check if the column exists and add it if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trios' 
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.trios 
        ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
        
        -- Add unique constraints to prevent multiple trios per day per user
        ALTER TABLE public.trios 
        ADD CONSTRAINT unique_date_user1 UNIQUE(date, user1_id);
        
        ALTER TABLE public.trios 
        ADD CONSTRAINT unique_date_user2 UNIQUE(date, user2_id);
        
        ALTER TABLE public.trios 
        ADD CONSTRAINT unique_date_user3 UNIQUE(date, user3_id);
        
        RAISE NOTICE 'Added date column to trios table';
    ELSE
        RAISE NOTICE 'Date column already exists in trios table';
    END IF;
END $$;

-- Now recreate the randomize_trios function with proper error handling
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
  
  -- Calculate how many trios we can make (groups of 3)
  IF user_count < 3 THEN
    DROP TABLE IF EXISTS temp_users;
    RETURN json_build_object(
      'success', false,
      'message', 'Not enough users for trios (need at least 3)',
      'created', 0
    );
  END IF;
  
  -- Create trios with users in groups of 3
  WHILE (SELECT COUNT(*) FROM temp_users) >= 3 LOOP
    DECLARE
      user1 uuid;
      user2 uuid;
      user3 uuid;
      remaining int;
    BEGIN
      SELECT COUNT(*) INTO remaining FROM temp_users;
      
      -- Make a group of 3
      SELECT id INTO user1 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user1;
      
      SELECT id INTO user2 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user2;
      
      SELECT id INTO user3 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user3;
      
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
      -- Create a duo (trio with NULL for third user)
      SELECT id INTO user1 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user1;
      
      SELECT id INTO user2 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user2;
      
      INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
      VALUES (user1, user2, NULL, today);
      
      created_count := created_count + 1;
    ELSIF remaining_count = 1 THEN
      -- Create a solo group for the single user
      SELECT id INTO user1 FROM temp_users LIMIT 1;
      DELETE FROM temp_users WHERE id = user1;
      
      INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
      VALUES (user1, NULL, NULL, today);
      
      created_count := created_count + 1;
    END IF;
  END;
  
  -- Clean up temp table
  DROP TABLE IF EXISTS temp_users;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'message', format('Created %s trios for %s users', created_count, user_count),
    'created', created_count,
    'date', today
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Clean up temp table in case of error
    DROP TABLE IF EXISTS temp_users;
    RETURN json_build_object(
      'success', false,
      'message', format('Error: %s', SQLERRM),
      'created', 0
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO anon;

-- Also fix the delete_todays_trios function
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
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error: %s', SQLERRM),
      'deleted', 0
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO anon;