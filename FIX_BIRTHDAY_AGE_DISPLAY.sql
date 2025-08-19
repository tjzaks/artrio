-- RUN THIS IN SUPABASE SQL EDITOR TO FIX BIRTHDAY/AGE DISPLAY

-- First, let's check if birthdays exist in the sensitive_user_data table
SELECT user_id, birthday FROM sensitive_user_data LIMIT 5;

-- Update the admin_get_sensitive_data function to properly fetch birthdays
CREATE OR REPLACE FUNCTION admin_get_sensitive_data(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_birthday DATE;
  v_age INTEGER;
BEGIN
  -- Check if the calling user is an admin
  SELECT is_admin INTO v_admin_check
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF v_admin_check IS NOT TRUE THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;
  
  -- Get birthday from sensitive_user_data
  SELECT birthday INTO v_birthday
  FROM sensitive_user_data
  WHERE user_id = target_user_id;
  
  -- Calculate age if birthday exists
  IF v_birthday IS NOT NULL THEN
    v_age := DATE_PART('year', AGE(v_birthday))::INTEGER;
  ELSE
    v_age := NULL;
  END IF;
  
  -- Return birthday and calculated age
  RETURN json_build_object(
    'birthday', v_birthday,
    'age', v_age
  );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION admin_get_sensitive_data(UUID) TO authenticated;

-- Test the function with a known user ID (replace with actual user ID)
-- SELECT admin_get_sensitive_data('7bb22480-1d1a-4d91-af1d-af008290af53');