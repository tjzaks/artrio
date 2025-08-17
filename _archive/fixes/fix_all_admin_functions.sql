-- Run this entire block to fix all admin functions

-- 1. Fix execute_sql to handle all SQL types
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  row_count int;
BEGIN
  -- For SELECT queries, return results
  IF upper(trim(query)) LIKE 'SELECT%' THEN
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::json);
  ELSE
    -- For other queries (INSERT, UPDATE, DELETE, CREATE, etc.), just execute
    EXECUTE query;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RETURN json_build_object(
      'success', true, 
      'message', 'Query executed successfully',
      'rows_affected', row_count
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM, 'success', false);
END;
$$;

-- 2. Create delete_todays_trios function
CREATE OR REPLACE FUNCTION delete_todays_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT := 0;
  today_date DATE := CURRENT_DATE;
BEGIN
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

-- 3. Fix randomize_trios to handle DELETE properly
CREATE OR REPLACE FUNCTION randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_ids UUID[];
  trio_count INT := 0;
  users_assigned INT := 0;
  total_users INT := 0;
  i INT;
  today_date DATE := CURRENT_DATE;
BEGIN
  SELECT COUNT(*) INTO total_users FROM profiles WHERE id IS NOT NULL;
  
  IF total_users < 3 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Not enough users. Found %s users, need at least 3', total_users),
      'trios_created', 0,
      'users_assigned', 0,
      'total_users', total_users
    );
  END IF;

  -- Archive existing active trios using UPDATE instead of DELETE
  UPDATE trios 
  SET archived_at = NOW() 
  WHERE date = today_date 
    AND archived_at IS NULL;
  
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) 
  INTO user_ids
  FROM profiles 
  WHERE id IS NOT NULL;
  
  i := 1;
  WHILE i + 2 <= array_length(user_ids, 1) LOOP
    INSERT INTO trios (
      user1_id, 
      user2_id, 
      user3_id, 
      created_at, 
      date
    )
    VALUES (
      user_ids[i], 
      user_ids[i+1], 
      user_ids[i+2], 
      NOW(),
      today_date
    );
    
    trio_count := trio_count + 1;
    users_assigned := users_assigned + 3;
    i := i + 3;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'trios_created', trio_count,
    'users_assigned', users_assigned,
    'total_users', total_users
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'trios_created', 0,
      'users_assigned', 0
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_todays_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION randomize_trios() TO authenticated;

-- Test everything
SELECT 'Functions created successfully!' as status;