-- Fix RLS policies for trios table to allow admin operations
-- Run this in your Supabase SQL editor

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'trios';

-- Create a function that admins can use to create trios (bypasses RLS)
CREATE OR REPLACE FUNCTION create_admin_trios(trio_data json[])
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
  
  -- Insert new trios
  INSERT INTO trios (user1_id, user2_id, user3_id, user4_id, user5_id, date)
  SELECT 
    (value->>'user1_id')::uuid,
    (value->>'user2_id')::uuid,
    (value->>'user3_id')::uuid,
    (value->>'user4_id')::uuid,
    (value->>'user5_id')::uuid,
    (value->>'date')::date
  FROM json_array_elements(trio_data::json) AS value;
  
  RETURN json_build_object('success', true, 'message', 'Trios created successfully');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_admin_trios(json[]) TO authenticated;

-- Alternative: Add a policy to allow admins to insert trios
CREATE POLICY "Admins can insert trios" ON trios
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Also allow admins to delete trios
CREATE POLICY "Admins can delete trios" ON trios
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);