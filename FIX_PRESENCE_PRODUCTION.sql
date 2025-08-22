-- PRODUCTION FIX FOR ONLINE PRESENCE
-- Run this entire script in Supabase SQL Editor
-- Date: 2025-01-22

-- Step 1: Add presence columns if missing
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create performance index
CREATE INDEX IF NOT EXISTS idx_profiles_presence 
ON profiles(user_id, is_online, last_seen);

-- Step 3: Enable realtime for profiles table
-- This is CRITICAL - without this, presence updates won't broadcast
BEGIN;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
COMMIT;

-- Step 4: Fix RLS policies for presence updates
-- Drop all old presence policies
DROP POLICY IF EXISTS "Users can update own presence" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them" ON profiles;

-- Create new comprehensive policies
-- Allow anyone to read all profiles (needed for presence)
CREATE POLICY "Anyone can view profiles" ON profiles
FOR SELECT USING (true);

-- Allow users to update ONLY their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 5: Create auto-update trigger for last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_seen whenever is_online changes
    IF NEW.is_online IS DISTINCT FROM OLD.is_online THEN
        NEW.last_seen = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS update_last_seen_trigger ON profiles;

-- Create new trigger
CREATE TRIGGER update_last_seen_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_last_seen();

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;

-- Step 7: Clean slate - set everyone offline
UPDATE profiles SET is_online = false, last_seen = NOW();

-- Step 8: Verify the setup
DO $$
DECLARE
    realtime_enabled BOOLEAN;
    columns_exist BOOLEAN;
    policies_count INTEGER;
BEGIN
    -- Check if realtime is enabled
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) INTO realtime_enabled;
    
    -- Check if columns exist
    SELECT COUNT(*) = 2 FROM information_schema.columns
    WHERE table_name = 'profiles' 
    AND column_name IN ('is_online', 'last_seen')
    INTO columns_exist;
    
    -- Check if policies exist
    SELECT COUNT(*) FROM pg_policies 
    WHERE tablename = 'profiles'
    INTO policies_count;
    
    -- Report results
    RAISE NOTICE '=== PRESENCE FIX VERIFICATION ===';
    RAISE NOTICE 'Realtime enabled: %', realtime_enabled;
    RAISE NOTICE 'Columns exist: %', columns_exist;
    RAISE NOTICE 'RLS policies count: %', policies_count;
    
    IF realtime_enabled AND columns_exist AND policies_count >= 3 THEN
        RAISE NOTICE '✅ PRESENCE FIX APPLIED SUCCESSFULLY!';
    ELSE
        RAISE WARNING '⚠️ PRESENCE FIX MAY BE INCOMPLETE - CHECK MANUALLY';
    END IF;
END $$;

-- Step 9: Test with a manual update
-- This should succeed if everything is configured correctly
UPDATE profiles 
SET is_online = true, last_seen = NOW()
WHERE user_id = auth.uid()
RETURNING user_id, username, is_online, last_seen;