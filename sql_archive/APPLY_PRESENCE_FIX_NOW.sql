-- PRESENCE FIX - CLEAN VERSION
-- Copy and paste this ENTIRE file into Supabase SQL Editor

-- Add presence columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_presence 
ON profiles(user_id, is_online, last_seen);

-- Enable realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
        RAISE NOTICE 'Added profiles to realtime';
    ELSE
        RAISE NOTICE 'Profiles already in realtime';
    END IF;
END $$;

-- Drop ALL old policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
    RAISE NOTICE 'Dropped old policies';
END $$;

-- Create new policies
CREATE POLICY "presence_select" ON profiles
FOR SELECT USING (true);

CREATE POLICY "presence_update" ON profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "presence_insert" ON profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_online IS DISTINCT FROM OLD.is_online THEN
        NEW.last_seen = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS update_last_seen_trigger ON profiles;
CREATE TRIGGER update_last_seen_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_last_seen();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;

-- Reset everyone to offline
UPDATE profiles SET is_online = false, last_seen = NOW();

-- Verify everything worked
DO $$
DECLARE
    realtime_ok BOOLEAN;
    columns_ok BOOLEAN;
    policies_ok BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) INTO realtime_ok;
    
    SELECT COUNT(*) = 2 FROM information_schema.columns
    WHERE table_name = 'profiles' 
    AND column_name IN ('is_online', 'last_seen')
    INTO columns_ok;
    
    SELECT COUNT(*) >= 3 FROM pg_policies 
    WHERE tablename = 'profiles'
    INTO policies_ok;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'PRESENCE FIX RESULTS:';
    RAISE NOTICE 'Realtime enabled: %', realtime_ok;
    RAISE NOTICE 'Columns exist: %', columns_ok;
    RAISE NOTICE 'Policies created: %', policies_ok;
    
    IF realtime_ok AND columns_ok AND policies_ok THEN
        RAISE NOTICE '==========================================';
        RAISE NOTICE 'SUCCESS! PRESENCE IS FIXED!';
        RAISE NOTICE '==========================================';
    ELSE
        RAISE WARNING 'SOMETHING FAILED - CHECK ABOVE';
    END IF;
END $$;

-- Test it works
UPDATE profiles 
SET is_online = true, last_seen = NOW()
WHERE user_id = auth.uid()
RETURNING user_id, username, is_online, last_seen;