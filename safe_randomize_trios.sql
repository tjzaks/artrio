-- Safe version of randomize_trios that checks table structure first
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
  has_correct_columns boolean;
BEGIN
  -- Check if we have the required columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trios' 
    AND column_name IN ('user1_id', 'user2_id', 'user3_id', 'date')
    GROUP BY table_name
    HAVING COUNT(*) = 4
  ) INTO has_correct_columns;
  
  IF NOT has_correct_columns THEN
    -- Try to add the missing columns
    BEGIN
      ALTER TABLE public.trios 
      ADD COLUMN IF NOT EXISTS user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
      
      ALTER TABLE public.trios 
      ADD COLUMN IF NOT EXISTS user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
      
      ALTER TABLE public.trios 
      ADD COLUMN IF NOT EXISTS user3_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
      
      ALTER TABLE public.trios 
      ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object(
          'success', false,
          'message', format('Table structure error: %s. Please run the fix_complete_trios_table.sql script in Supabase SQL Editor.', SQLERRM),
          'created', 0
        );
    END;
  END IF;
  
  -- Delete existing trios for today
  DELETE FROM public.trios WHERE date = today;
  
  -- Get all active users
  CREATE TEMP TABLE IF NOT EXISTS temp_users AS
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
      'message', format('Not enough users for trios (have %s, need at least 3)', user_count),
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
    'message', format('Created %s trios for %s users', created_count, user_count),
    'created', created_count,
    'date', today::text
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Clean up on error
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