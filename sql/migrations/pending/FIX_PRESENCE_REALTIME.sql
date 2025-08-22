-- Ensure presence columns exist with proper defaults
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster presence queries
CREATE INDEX IF NOT EXISTS idx_profiles_presence 
ON profiles(user_id, is_online, last_seen);

-- Enable realtime for profiles table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Update RLS policies to allow users to update their own presence
DROP POLICY IF EXISTS "Users can update own presence" ON profiles;
CREATE POLICY "Users can update own presence" ON profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to read all profiles (including presence)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT
USING (true);

-- Set all users to offline initially (clean slate)
UPDATE profiles SET is_online = false, last_seen = NOW();

-- Create a function to auto-update last_seen when is_online changes
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_online != OLD.is_online THEN
        NEW.last_seen = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating last_seen
DROP TRIGGER IF EXISTS update_last_seen_trigger ON profiles;
CREATE TRIGGER update_last_seen_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_last_seen();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;