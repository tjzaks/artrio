-- WORKAROUND: Create a wrapper function that definitely returns JSON
-- This bypasses any type casting issues

-- First drop the wrapper if it exists
DROP FUNCTION IF EXISTS public.randomize_trios_safe();

-- Create a safe wrapper function
CREATE OR REPLACE FUNCTION public.randomize_trios_safe()
RETURNS text  -- Return as TEXT to avoid any JSON casting issues
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_json json;
  result_text text;
BEGIN
  -- Call the original function
  SELECT randomize_trios() INTO result_json;
  
  -- Convert to text explicitly
  result_text := result_json::text;
  
  RETURN result_text;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error as text
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'created', 0
    )::text;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.randomize_trios_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_trios_safe() TO anon;
GRANT EXECUTE ON FUNCTION public.randomize_trios_safe() TO service_role;

-- Test it
SELECT randomize_trios_safe() AS result;