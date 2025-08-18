-- Create a function to delete today's trios
CREATE OR REPLACE FUNCTION delete_todays_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT := 0;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Delete all trios for today
  DELETE FROM trios 
  WHERE date = today_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'date', today_date
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'deleted_count', 0
    );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION delete_todays_trios() TO authenticated;