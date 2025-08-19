-- Fix the create_admin_trios function to accept json instead of json[]
CREATE OR REPLACE FUNCTION create_admin_trios(trio_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result json;
BEGIN
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF v_is_admin IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Delete today's trios first
  DELETE FROM trios WHERE date = CURRENT_DATE;
  
  -- Insert new trios from JSON array
  INSERT INTO trios (user1_id, user2_id, user3_id, user4_id, user5_id, date)
  SELECT 
    (value->>'user1_id')::uuid,
    (value->>'user2_id')::uuid,
    (value->>'user3_id')::uuid,
    (value->>'user4_id')::uuid,
    (value->>'user5_id')::uuid,
    (value->>'date')::date
  FROM json_array_elements(trio_data) AS value;
  
  RETURN json_build_object('success', true, 'message', 'Trios created successfully');
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION create_admin_trios(json) TO authenticated;