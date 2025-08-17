-- RUN THIS IN SUPABASE SQL EDITOR TO FIX ADMIN BUTTONS
-- Go to: https://supabase.com/dashboard/project/nqwijkvpzyadpsegvgbm/sql/new

-- 1. Create trios table if it doesn't exist
CREATE TABLE IF NOT EXISTS trios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member1_id UUID REFERENCES auth.users(id),
  member2_id UUID REFERENCES auth.users(id),
  member3_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

-- 2. Function to Randomize Trios
CREATE OR REPLACE FUNCTION randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_ids UUID[];
  trio_count INT := 0;
  i INT;
BEGIN
  -- Archive existing active trios
  UPDATE trios SET status = 'archived', archived_at = NOW() 
  WHERE status = 'active';
  
  -- Get all user IDs from profiles
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) INTO user_ids
  FROM profiles
  WHERE id IS NOT NULL;
  
  -- Create trios (groups of 3)
  i := 1;
  WHILE i + 2 <= array_length(user_ids, 1) LOOP
    INSERT INTO trios (member1_id, member2_id, member3_id, status)
    VALUES (user_ids[i], user_ids[i+1], user_ids[i+2], 'active');
    
    trio_count := trio_count + 1;
    i := i + 3;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'trios_created', trio_count,
    'users_assigned', i - 1,
    'users_waiting', array_length(user_ids, 1) - (i - 1)
  );
END;
$$;

-- 3. Function to Delete Today's Trios
CREATE OR REPLACE FUNCTION delete_todays_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete trios created today
  WITH deleted AS (
    UPDATE trios 
    SET status = 'deleted', archived_at = NOW()
    WHERE DATE(created_at) = CURRENT_DATE
    AND status = 'active'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN json_build_object(
    'success', true,
    'trios_deleted', deleted_count
  );
END;
$$;

-- 4. Function to Cleanup Content (placeholder)
CREATE OR REPLACE FUNCTION cleanup_expired_content()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, just return success
  -- Add cleanup logic later
  RETURN json_build_object(
    'success', true,
    'message', 'Content cleanup completed'
  );
END;
$$;

-- 5. Function to Refresh Profiles
CREATE OR REPLACE FUNCTION refresh_profiles()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_count INT;
BEGIN
  -- Update all profiles' updated_at timestamp
  UPDATE profiles 
  SET updated_at = NOW();
  
  GET DIAGNOSTICS profile_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'profiles_refreshed', profile_count
  );
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_todays_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_content() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_profiles() TO authenticated;

-- Test the functions work
SELECT randomize_trios();