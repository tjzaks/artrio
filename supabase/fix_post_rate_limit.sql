-- Fix posts rate limiting for development
-- Run this in Supabase SQL Editor to allow more frequent posting

-- First, let's see what policies exist on posts table
SELECT polname, polcmd, polroles::regrole, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'posts'::regclass;

-- Drop the existing insert policy if it has rate limiting
DROP POLICY IF EXISTS "Users can create posts" ON posts;

-- Create a new insert policy without rate limiting
CREATE POLICY "Users can create posts" ON posts
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Update the rate limit function to return 0 (no wait time)
CREATE OR REPLACE FUNCTION public.seconds_until_next_post(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  -- For development, always return 0 (no rate limit)
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Change the rate limit to 30 seconds instead of 10 minutes
-- CREATE OR REPLACE FUNCTION public.seconds_until_next_post(user_id_param UUID)
-- RETURNS INTEGER AS $$
-- DECLARE
--   last_post_time TIMESTAMP WITH TIME ZONE;
--   seconds_passed INTEGER;
--   seconds_required INTEGER := 30; -- 30 seconds instead of 600
-- BEGIN
--   SELECT created_at INTO last_post_time
--   FROM public.posts
--   WHERE user_id = user_id_param
--   ORDER BY created_at DESC
--   LIMIT 1;
--   
--   IF last_post_time IS NULL THEN
--     RETURN 0;
--   END IF;
--   
--   seconds_passed := EXTRACT(EPOCH FROM (now() - last_post_time))::INTEGER;
--   
--   IF seconds_passed >= seconds_required THEN
--     RETURN 0;
--   ELSE
--     RETURN seconds_required - seconds_passed;
--   END IF;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;