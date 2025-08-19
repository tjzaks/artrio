-- FIX RANDOMIZE TRIOS FUNCTION (Fixes max(uuid) error)
-- Run this in Supabase SQL Editor
-- ============================================

DROP FUNCTION IF EXISTS public.randomize_trios();

CREATE OR REPLACE FUNCTION public.randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  created_count int := 0;
  user_count int;
  users_array uuid[];
  i int;
  new_trio_id uuid;
BEGIN
  -- Delete existing trios for today
  DELETE FROM public.trio_members 
  WHERE trio_id IN (
    SELECT id FROM public.trios 
    WHERE DATE(created_at) = CURRENT_DATE
  );
  
  DELETE FROM public.trios 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Get all active users shuffled randomly
  SELECT array_agg(id ORDER BY RANDOM())
  INTO users_array
  FROM public.profiles
  WHERE id IS NOT NULL;
  
  -- Get count of available users
  user_count := array_length(users_array, 1);
  
  -- Need at least 3 users
  IF user_count IS NULL OR user_count < 3 THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Not enough users for trios (have %s, need at least 3)', COALESCE(user_count, 0)),
      'created', 0
    );
  END IF;
  
  -- Create trios with users in groups of 3
  i := 1;
  WHILE i + 2 <= user_count LOOP
    -- Generate new trio ID
    new_trio_id := gen_random_uuid();
    
    -- Create a trio
    INSERT INTO public.trios (id, created_at, ends_at)
    VALUES (new_trio_id, NOW(), NOW() + INTERVAL '24 hours');
    
    -- Add the three members
    INSERT INTO public.trio_members (trio_id, user_id, profile_id)
    VALUES 
      (new_trio_id, users_array[i], users_array[i]),
      (new_trio_id, users_array[i+1], users_array[i+1]),
      (new_trio_id, users_array[i+2], users_array[i+2]);
    
    created_count := created_count + 1;
    i := i + 3;
  END LOOP;
  
  -- Handle remaining users (1 or 2 left over)
  IF i <= user_count THEN
    -- Generate new trio ID
    new_trio_id := gen_random_uuid();
    
    -- Create a partial trio
    INSERT INTO public.trios (id, created_at, ends_at)
    VALUES (new_trio_id, NOW(), NOW() + INTERVAL '24 hours');
    
    -- Add remaining members
    WHILE i <= user_count LOOP
      INSERT INTO public.trio_members (trio_id, user_id, profile_id)
      VALUES (new_trio_id, users_array[i], users_array[i]);
      i := i + 1;
    END LOOP;
    
    created_count := created_count + 1;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Created %s trios for %s users', created_count, user_count),
    'created', created_count,
    'date', CURRENT_DATE::text
  );
  
EXCEPTION
  WHEN OTHERS THEN
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

-- SUCCESS! Randomize Trios should now work without errors