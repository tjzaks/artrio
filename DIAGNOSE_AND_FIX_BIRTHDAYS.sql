-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO DIAGNOSE AND FIX BIRTHDAY ISSUES

-- 1. Check if sensitive_user_data table exists and has data
SELECT COUNT(*) as total_records FROM sensitive_user_data;

-- 2. Check what columns exist in sensitive_user_data
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sensitive_user_data';

-- 3. Check if any birthdays are actually stored
SELECT user_id, birthday 
FROM sensitive_user_data 
WHERE birthday IS NOT NULL
LIMIT 5;

-- 4. Check if birthdays might be stored in profiles table instead
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%birth%' OR column_name LIKE '%age%' OR column_name LIKE '%dob%';

-- 5. If sensitive_user_data table doesn't exist or is empty, create and populate it
-- First, create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS sensitive_user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  birthday DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create RLS policies for sensitive_user_data if they don't exist
ALTER TABLE sensitive_user_data ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sensitive data
CREATE POLICY IF NOT EXISTS "Users can view own sensitive data" 
ON sensitive_user_data FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own sensitive data
CREATE POLICY IF NOT EXISTS "Users can update own sensitive data" 
ON sensitive_user_data FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own sensitive data
CREATE POLICY IF NOT EXISTS "Users can insert own sensitive data" 
ON sensitive_user_data FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 7. If birthdays are missing, let's add some test data for existing users
-- (You can modify these dates as needed)
DO $$
DECLARE
  v_user_record RECORD;
BEGIN
  -- Loop through all users who don't have sensitive data
  FOR v_user_record IN 
    SELECT u.id 
    FROM auth.users u
    LEFT JOIN sensitive_user_data sd ON sd.user_id = u.id
    WHERE sd.user_id IS NULL
  LOOP
    -- Insert a placeholder record (no birthday yet)
    INSERT INTO sensitive_user_data (user_id, birthday)
    VALUES (v_user_record.id, NULL)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

-- 8. Manually add some test birthdays for testing (update with real user IDs and dates)
-- Example: UPDATE sensitive_user_data SET birthday = '2000-01-15' WHERE user_id = '7bb22480-1d1a-4d91-af1d-af008290af53';
-- Example: UPDATE sensitive_user_data SET birthday = '1995-06-20' WHERE user_id = 'c45a14ee-ccec-47d6-9f57-dfe6950f1922';

-- 9. Test the admin function again
SELECT admin_get_sensitive_data('7bb22480-1d1a-4d91-af1d-af008290af53');

-- 10. Show all users and their birthday status
SELECT 
  p.username,
  p.user_id,
  sd.birthday,
  CASE 
    WHEN sd.birthday IS NOT NULL THEN DATE_PART('year', AGE(sd.birthday))::TEXT || ' years old'
    ELSE 'No birthday set'
  END as age
FROM profiles p
LEFT JOIN sensitive_user_data sd ON sd.user_id = p.user_id
ORDER BY p.created_at DESC;