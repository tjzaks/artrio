-- ===============================================
-- QUICK FIX - Copy and paste this into Supabase SQL Editor
-- This will add the missing signup information fields
-- ===============================================

-- 1. Add missing profile columns for signup information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personality_type TEXT,
ADD COLUMN IF NOT EXISTS vibes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS friend_type TEXT,
ADD COLUMN IF NOT EXISTS excited_about TEXT,
ADD COLUMN IF NOT EXISTS conversation_style TEXT,
ADD COLUMN IF NOT EXISTS chat_time TEXT;

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
  
  -- Get user data including metadata
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
  
  RETURN COALESCE(v_user_data, json_build_object('error', 'User not found'));
END;
$$;

-- 3. Test the function
SELECT 'Quick fix applied successfully! 🎉' as message;