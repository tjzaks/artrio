-- Secure Admin Functions with Proper Authorization
-- This replaces the dangerous execute_sql function with secure, specific admin functions

-- First, drop the dangerous execute_sql function if it exists
DROP FUNCTION IF EXISTS execute_sql(text);

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND role = 'admin'
  );
END;
$$;

-- Secure randomize_trios function with admin check
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
  calling_user_id UUID;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT is_admin(calling_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Log the admin action
  INSERT INTO public.admin_logs (admin_id, action, details)
  VALUES (calling_user_id, 'randomize_trios', json_build_object('date', today_date));

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

  -- Archive existing active trios
  UPDATE trios 
  SET archived_at = NOW() 
  WHERE date = today_date 
    AND archived_at IS NULL;
  
  -- Get all user IDs and randomize
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) 
  INTO user_ids
  FROM profiles 
  WHERE id IS NOT NULL;
  
  -- Create trios
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

-- Secure delete_todays_trios function with admin check
CREATE OR REPLACE FUNCTION delete_todays_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT := 0;
  today_date DATE := CURRENT_DATE;
  calling_user_id UUID;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT is_admin(calling_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Log the admin action
  INSERT INTO public.admin_logs (admin_id, action, details)
  VALUES (calling_user_id, 'delete_todays_trios', json_build_object('date', today_date));

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

-- Secure cleanup_expired_content function with admin check
CREATE OR REPLACE FUNCTION cleanup_expired_content()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_posts INT := 0;
  deleted_messages INT := 0;
  calling_user_id UUID;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT is_admin(calling_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Log the admin action
  INSERT INTO public.admin_logs (admin_id, action, details)
  VALUES (calling_user_id, 'cleanup_expired_content', json_build_object('timestamp', NOW()));

  -- Delete posts older than 30 days
  DELETE FROM posts WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_posts = ROW_COUNT;
  
  -- Delete messages older than 30 days
  DELETE FROM messages WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'deleted_posts', deleted_posts,
    'deleted_messages', deleted_messages
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'deleted_posts', 0,
      'deleted_messages', 0
    );
END;
$$;

-- Create admin_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for admin_logs
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin logs
CREATE POLICY "Admins can view all admin logs" ON public.admin_logs
  FOR SELECT USING (is_admin(auth.uid()));

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION randomize_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_todays_trios() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_content() TO authenticated;

-- Revoke any dangerous permissions
REVOKE ALL ON FUNCTION execute_sql(text) FROM PUBLIC CASCADE IF EXISTS;

-- Add rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
  action_name TEXT,
  max_attempts INT DEFAULT 10,
  window_minutes INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INT;
  user_id UUID;
BEGIN
  user_id := auth.uid();
  
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM public.rate_limit_log
  WHERE user_id = check_rate_limit.user_id
    AND action = action_name
    AND created_at > NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Check if limit exceeded
  IF attempt_count >= max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Log this attempt
  INSERT INTO public.rate_limit_log (user_id, action)
  VALUES (user_id, action_name);
  
  -- Clean old entries
  DELETE FROM public.rate_limit_log
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  RETURN TRUE;
END;
$$;

-- Create rate limit log table
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action 
  ON public.rate_limit_log(user_id, action, created_at DESC);

-- Enable RLS on rate_limit_log
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit logs
CREATE POLICY "Users can view own rate limit logs" ON public.rate_limit_log
  FOR SELECT USING (auth.uid() = user_id);

GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INT, INT) TO authenticated;