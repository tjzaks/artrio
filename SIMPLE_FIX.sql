-- SIMPLE SOLUTION - Stop overengineering

-- 1. Delete EVERYTHING related to randomize_trios
DROP FUNCTION IF EXISTS public.randomize_trios() CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios_safe() CASCADE;

-- 2. Create the SIMPLEST possible function that just works
CREATE OR REPLACE FUNCTION public.randomize_trios()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete today's trios
  DELETE FROM public.trios WHERE date = CURRENT_DATE;
  
  -- Insert new trios from profiles
  INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
  SELECT 
    p1.id,
    p2.id,
    p3.id,
    CURRENT_DATE
  FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn FROM profiles) p1
  JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn FROM profiles) p2 ON p2.rn = p1.rn + 1
  JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn FROM profiles) p3 ON p3.rn = p1.rn + 2
  WHERE p1.rn % 3 = 1;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.randomize_trios() TO authenticated;

-- 4. Test it
SELECT randomize_trios();