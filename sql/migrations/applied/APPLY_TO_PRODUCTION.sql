-- ===============================================
-- PRODUCTION DATABASE UPDATE SCRIPT
-- Run this in your Supabase SQL Editor
-- ===============================================

-- 1. Add missing profile fields for signup information
-- (These might already exist, but adding IF NOT EXISTS for safety)

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personality_type TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vibes TEXT[] DEFAULT '{}';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS friend_type TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS excited_about TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS conversation_style TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS chat_time TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_personality_type ON profiles(personality_type);
CREATE INDEX IF NOT EXISTS idx_profiles_vibes ON profiles USING GIN(vibes);
CREATE INDEX IF NOT EXISTS idx_profiles_chat_time ON profiles(chat_time);
CREATE INDEX IF NOT EXISTS idx_profiles_conversation_style ON profiles(conversation_style);

-- 2. Enhance admin_get_user_email function to include auth metadata
CREATE OR REPLACE FUNCTION admin_get_user_email(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_user_data JSON;
BEGIN
  -- Check if the calling user is an admin
  SELECT is_admin INTO v_admin_check
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF NOT v_admin_check THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;
  
  -- Admins can see all user data, including other admins and auth metadata
  SELECT json_build_object(
    'email', email,
    'created_at', created_at,
    'last_sign_in_at', last_sign_in_at,
    'email_confirmed_at', email_confirmed_at,
    'user_metadata', user_metadata,
    'raw_user_meta_data', raw_user_meta_data
  ) INTO v_user_data
  FROM auth.users
  WHERE id = target_user_id;
  
  IF v_user_data IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  
  RETURN v_user_data;
END;
$$;

-- Grant execute permission to authenticated users (admin check is done inside function)
GRANT EXECUTE ON FUNCTION admin_get_user_email(UUID) TO authenticated;

-- Update comment for documentation
COMMENT ON FUNCTION admin_get_user_email(UUID) IS 
'Admin-only function to get email, auth data, and metadata (first_name, last_name) for any user including other admins';

-- 3. Ensure admin_get_sensitive_data function exists and works properly
CREATE OR REPLACE FUNCTION admin_get_sensitive_data(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_sensitive_data JSON;
  v_birthday DATE;
  v_age INTEGER;
BEGIN
  -- Check if the calling user is an admin
  SELECT is_admin INTO v_admin_check
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF NOT v_admin_check THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;
  
  -- Get sensitive data (birthday) for any user
  SELECT birthday INTO v_birthday
  FROM sensitive_user_data
  WHERE user_id = target_user_id;
  
  -- Calculate age if birthday exists
  IF v_birthday IS NOT NULL THEN
    v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_birthday));
  END IF;
  
  -- Build response with birthday and calculated age
  v_sensitive_data := json_build_object(
    'birthday', v_birthday,
    'age', v_age
  );
  
  RETURN v_sensitive_data;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_sensitive_data(UUID) TO authenticated;

-- Update comment
COMMENT ON FUNCTION admin_get_sensitive_data(UUID) IS 
'Admin-only function to get sensitive data (birthday and age) for any user';

-- 4. Create index on sensitive_user_data for better performance
CREATE INDEX IF NOT EXISTS idx_sensitive_user_data_user_id ON sensitive_user_data(user_id);

-- Success message
SELECT 'Production database updated successfully! 🎉' as message;
SELECT 'Admin interface should now show complete signup information.' as status;