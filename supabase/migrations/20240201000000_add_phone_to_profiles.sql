-- Add phone number to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add index for phone lookups (useful for finding users by phone)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);

-- Add constraint to ensure phone numbers are unique
ALTER TABLE profiles 
ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);

-- Update RLS policies to include phone_number
-- Users can see their own phone number but not others'
CREATE OR REPLACE FUNCTION get_profile_with_privacy(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username_change_count INTEGER,
  last_username_change TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.bio,
    p.avatar_url,
    CASE 
      WHEN p.user_id = auth.uid() THEN p.phone_number
      ELSE NULL
    END as phone_number,
    p.created_at,
    p.updated_at,
    p.username_change_count,
    p.last_username_change
  FROM profiles p
  WHERE p.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate phone number format
CREATE OR REPLACE FUNCTION validate_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL phone numbers
  IF NEW.phone_number IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Remove all non-digit characters for validation
  DECLARE
    digits_only TEXT;
  BEGIN
    digits_only := regexp_replace(NEW.phone_number, '[^0-9]', '', 'g');
    
    -- Check length (7-15 digits for international support)
    IF length(digits_only) < 7 OR length(digits_only) > 15 THEN
      RAISE EXCEPTION 'Invalid phone number: must be between 7 and 15 digits';
    END IF;
    
    -- For US numbers (10 digits), check valid area code
    IF length(digits_only) = 10 AND (substring(digits_only, 1, 1) IN ('0', '1')) THEN
      RAISE EXCEPTION 'Invalid US phone number: area code cannot start with 0 or 1';
    END IF;
    
    -- Store only digits in database for consistency
    NEW.phone_number := digits_only;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate phone numbers on insert/update
CREATE TRIGGER validate_phone_number_trigger
BEFORE INSERT OR UPDATE OF phone_number ON profiles
FOR EACH ROW
EXECUTE FUNCTION validate_phone_number();

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;