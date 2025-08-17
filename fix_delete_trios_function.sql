-- Create the delete_todays_trios function
CREATE OR REPLACE FUNCTION public.delete_todays_trios()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all trios for today's date
  DELETE FROM trios 
  WHERE date = CURRENT_DATE::text;
  
  -- Log the action
  INSERT INTO admin_logs (action, details)
  VALUES ('delete_todays_trios', json_build_object(
    'deleted_at', NOW(),
    'date', CURRENT_DATE::text
  ));
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO authenticated;

-- Also create cleanup_expired_posts function if missing
CREATE OR REPLACE FUNCTION public.cleanup_expired_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete posts older than 24 hours
  DELETE FROM posts 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Log the action
  INSERT INTO admin_logs (action, details)
  VALUES ('cleanup_expired_posts', json_build_object(
    'cleaned_at', NOW()
  ));
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_expired_posts() TO authenticated;