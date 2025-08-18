-- Create a function to execute arbitrary SQL (ADMIN USE ONLY!)
-- Run this ONCE in Supabase SQL Editor

CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Security check - only allow tyler to run this
  IF auth.uid() != 'f1fc4b18-731e-4768-83f7-5ac90e42e037' THEN
    RAISE EXCEPTION 'Unauthorized: Only admin can execute SQL';
  END IF;

  -- Execute the query and return results as JSON
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  
  -- If no results (like for INSERT/UPDATE/DELETE), return success
  IF result IS NULL THEN
    RETURN json_build_object('success', true, 'message', 'Query executed successfully');
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM, 'success', false);
END;
$$;

-- Grant permission only to authenticated users (tyler)
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;

-- Test it
SELECT execute_sql('SELECT COUNT(*) as count FROM profiles');