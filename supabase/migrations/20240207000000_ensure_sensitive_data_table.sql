-- Ensure sensitive_user_data table exists with proper structure
CREATE TABLE IF NOT EXISTS public.sensitive_user_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  birthday DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sensitive_user_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own sensitive data" ON public.sensitive_user_data;
DROP POLICY IF EXISTS "Users can insert own sensitive data" ON public.sensitive_user_data;
DROP POLICY IF EXISTS "Users can update own sensitive data" ON public.sensitive_user_data;

-- Create RLS policies
CREATE POLICY "Users can view own sensitive data" 
ON public.sensitive_user_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensitive data" 
ON public.sensitive_user_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sensitive data" 
ON public.sensitive_user_data 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create or replace the admin function to get sensitive data
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_sensitive_data(UUID) TO authenticated;

-- Insert sensitive data records for existing users who don't have them
INSERT INTO sensitive_user_data (user_id, birthday)
SELECT 
  u.id as user_id,
  NULL as birthday
FROM auth.users u
LEFT JOIN sensitive_user_data sd ON sd.user_id = u.id
WHERE sd.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update trigger for updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_sensitive_data_updated_at ON public.sensitive_user_data;
CREATE TRIGGER update_sensitive_data_updated_at 
BEFORE UPDATE ON public.sensitive_user_data
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();