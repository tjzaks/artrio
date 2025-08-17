-- Missing Admin Functions for Artrio
-- Run these in Supabase SQL Editor

-- 1. Cleanup Expired Content Function
CREATE OR REPLACE FUNCTION cleanup_expired_content()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT := 0;
BEGIN
  -- Delete posts older than 24 hours
  DELETE FROM posts 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'deleted_posts', deleted_count
  );
END;
$$;

-- 2. Populate Safe Profiles Function
CREATE OR REPLACE FUNCTION populate_safe_profiles()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INT := 0;
BEGIN
  -- Update any profiles that might need refreshing
  -- This is a placeholder - adjust based on your actual safe profile logic
  UPDATE profiles 
  SET updated_at = NOW()
  WHERE updated_at < NOW() - INTERVAL '1 day';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'profiles_updated', updated_count
  );
END;
$$;

-- 3. Delete Today's Trios Function (alternative approach)
CREATE OR REPLACE FUNCTION delete_todays_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT := 0;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Delete trios created today
  DELETE FROM trios 
  WHERE DATE(created_at) = today_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'trios_deleted', deleted_count
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_content() TO authenticated;
GRANT EXECUTE ON FUNCTION populate_safe_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_todays_trios() TO authenticated;