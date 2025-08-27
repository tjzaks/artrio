-- Fix phone number storage issue that Toby was debugging
-- Ensure phone numbers are properly stored during signup

-- Ensure profiles table has phone_number column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Update the handle_new_user trigger to properly store phone numbers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_avatar_url text;
BEGIN
  -- Select a random avatar URL
  SELECT avatar_url INTO random_avatar_url
  FROM (
    VALUES 
      ('https://api.dicebear.com/9.x/notionists/svg?seed=Garfield'),
      ('https://api.dicebear.com/9.x/notionists/svg?seed=Abby'),
      ('https://api.dicebear.com/9.x/notionists/svg?seed=Angel'),
      ('https://api.dicebear.com/9.x/notionists/svg?seed=Baby'),
      ('https://api.dicebear.com/9.x/notionists/svg?seed=Bailey')
  ) AS avatars(avatar_url)
  ORDER BY random()
  LIMIT 1;

  -- Insert the new profile with phone number from metadata
  INSERT INTO public.profiles (
    id,
    user_id,
    username,
    bio,
    avatar_url,
    phone_number,
    personality_type,
    vibes,
    friend_type,
    excited_about,
    conversation_style,
    chat_time
  ) VALUES (
    gen_random_uuid(),
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'bio',
    COALESCE(new.raw_user_meta_data->>'avatar_url', random_avatar_url),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'personality_type',
    CASE 
      WHEN new.raw_user_meta_data->>'vibes' IS NOT NULL 
      THEN string_to_array(trim(both '[]"' from new.raw_user_meta_data->>'vibes'), ',')
      ELSE NULL
    END,
    new.raw_user_meta_data->>'friend_type',
    new.raw_user_meta_data->>'excited_about',
    new.raw_user_meta_data->>'conversation_style',
    new.raw_user_meta_data->>'chat_time'
  );

  -- Store birthday in sensitive_user_data
  IF new.raw_user_meta_data->>'birthday' IS NOT NULL THEN
    INSERT INTO public.sensitive_user_data (user_id, birthday)
    VALUES (new.id, (new.raw_user_meta_data->>'birthday')::date)
    ON CONFLICT (user_id) DO UPDATE
    SET birthday = (new.raw_user_meta_data->>'birthday')::date;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing profiles that might be missing phone numbers
-- This updates profiles where we have phone data in auth metadata but not in profile
UPDATE public.profiles p
SET phone_number = u.raw_user_meta_data->>'phone'
FROM auth.users u
WHERE p.user_id = u.id
  AND p.phone_number IS NULL
  AND u.raw_user_meta_data->>'phone' IS NOT NULL;

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.sensitive_user_data TO authenticated;

-- Add helpful comment
COMMENT ON COLUMN public.profiles.phone_number IS 'User phone number stored during signup for trio notifications';