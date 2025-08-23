-- Update handle_new_user trigger to also create sensitive_user_data entry
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create profile entry
  INSERT INTO public.profiles (user_id, username, bio, phone_number)
  VALUES (
    NEW.id,
    LOWER(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))),
    NEW.raw_user_meta_data->>'bio',
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), '')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    username = EXCLUDED.username,
    bio = EXCLUDED.bio,
    phone_number = EXCLUDED.phone_number;
  
  -- Create sensitive data entry with birthday
  IF NEW.raw_user_meta_data->>'birthday' IS NOT NULL THEN
    INSERT INTO public.sensitive_user_data (user_id, birthday)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'birthday')::DATE
    )
    ON CONFLICT (user_id) DO UPDATE
    SET birthday = EXCLUDED.birthday;
  ELSE
    -- Create entry with NULL birthday if not provided
    INSERT INTO public.sensitive_user_data (user_id, birthday)
    VALUES (NEW.id, NULL)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();