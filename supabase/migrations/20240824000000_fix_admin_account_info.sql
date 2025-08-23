-- Fix admin account info display issues
-- This migration ensures all admin functions work properly and data is accessible

-- Ensure profiles table has phone_number column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Ensure profiles table has all necessary admin fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Ensure sensitive_user_data table exists
CREATE TABLE IF NOT EXISTS public.sensitive_user_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  birthday DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sensitive_user_data
ALTER TABLE public.sensitive_user_data ENABLE ROW LEVEL SECURITY;

-- Recreate admin function to get user email and auth data
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
  
  IF v_admin_check IS NOT TRUE THEN
    RETURN json_build_object('error', 'Not authorized - user is not admin');
  END IF;
  
  -- Get all auth user data for admins
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
    RETURN json_build_object('error', 'User not found in auth.users');
  END IF;
  
  RETURN v_user_data;
END;
$$;

-- Recreate admin function to get sensitive data
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
    RETURN json_build_object('error', 'Not authorized - user is not admin');
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_sensitive_data(UUID) TO authenticated;

-- Ensure all existing users have records in sensitive_user_data
INSERT INTO sensitive_user_data (user_id, birthday)
SELECT 
  u.id as user_id,
  NULL as birthday
FROM auth.users u
LEFT JOIN sensitive_user_data sd ON sd.user_id = u.id
WHERE sd.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create RLS policies for sensitive_user_data if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sensitive_user_data' 
    AND policyname = 'Users can view own sensitive data'
  ) THEN
    CREATE POLICY "Users can view own sensitive data" 
    ON public.sensitive_user_data 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sensitive_user_data' 
    AND policyname = 'Users can insert own sensitive data'
  ) THEN
    CREATE POLICY "Users can insert own sensitive data" 
    ON public.sensitive_user_data 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sensitive_user_data' 
    AND policyname = 'Users can update own sensitive data'
  ) THEN
    CREATE POLICY "Users can update own sensitive data" 
    ON public.sensitive_user_data 
    FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Also create the fallback function that the frontend tries first
CREATE OR REPLACE FUNCTION get_user_email_for_admin(target_user_id UUID)
RETURNS TABLE (
  email TEXT,
  last_sign_in_at TIMESTAMPTZ,
  user_metadata JSONB,
  raw_user_meta_data JSONB
) AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Return email and metadata for the target user
  RETURN QUERY
  SELECT 
    au.email::TEXT,
    au.last_sign_in_at,
    au.user_metadata,
    au.raw_user_meta_data
  FROM auth.users au
  WHERE au.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email_for_admin(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION admin_get_user_email(UUID) IS 
'Admin-only function to get email, auth data, and metadata for any user';

COMMENT ON FUNCTION admin_get_sensitive_data(UUID) IS 
'Admin-only function to get sensitive data (birthday and calculated age) for any user';

COMMENT ON FUNCTION get_user_email_for_admin(UUID) IS 
'Legacy admin function - returns table format instead of JSON for backwards compatibility';