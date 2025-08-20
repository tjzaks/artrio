-- NUCLEAR OPTION: Complete function recreation with different approach
-- The error persists even with void return, so let's try a completely different strategy

-- 1. Drop ALL versions of the function
DROP FUNCTION IF EXISTS public.randomize_trios() CASCADE;
DROP FUNCTION IF EXISTS public.randomize_trios_safe() CASCADE;

-- 2. Create a NEW function with a DIFFERENT signature (add a dummy parameter)
CREATE OR REPLACE FUNCTION public.randomize_trios(dummy boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple deletion and insertion
  DELETE FROM public.trios WHERE date = CURRENT_DATE;
  
  -- Create new trios
  WITH numbered_profiles AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn 
    FROM profiles
  )
  INSERT INTO public.trios (user1_id, user2_id, user3_id, date)
  SELECT 
    p1.id,
    p2.id,
    p3.id,
    CURRENT_DATE
  FROM numbered_profiles p1
  JOIN numbered_profiles p2 ON p2.rn = p1.rn + 1
  JOIN numbered_profiles p3 ON p3.rn = p1.rn + 2
  WHERE (p1.rn - 1) % 3 = 0;
  
  -- No return statement needed for void
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.randomize_trios(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios(boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.randomize_trios(boolean) TO service_role;

-- 4. Force PostgREST to reload
NOTIFY pgrst, 'reload schema';

-- 5. Test it
SELECT randomize_trios();