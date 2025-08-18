-- SUPABASE CLEANUP AND PROPER SETUP
-- Run this to fix all database issues

-- ============================================
-- 1. CLEAN UP OLD/BROKEN DATA
-- ============================================

-- Clear all existing trios (fresh start)
TRUNCATE TABLE trios CASCADE;

-- Clear posts and replies (they reference deleted trios)
TRUNCATE TABLE posts CASCADE;
TRUNCATE TABLE replies CASCADE;
TRUNCATE TABLE notifications CASCADE;

-- ============================================
-- 2. FIX PROFILE STRUCTURE
-- ============================================

-- Ensure is_admin column exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Make Tyler admin
UPDATE profiles 
SET is_admin = true 
WHERE username = 'tyler';

-- ============================================
-- 3. CREATE PROPER FUNCTIONS
-- ============================================

-- Function to get user's trio (bypasses PostgREST OR bug)
CREATE OR REPLACE FUNCTION get_user_trio_for_date(
  auth_user_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  user1_id UUID,
  user2_id UUID,
  user3_id UUID,
  user4_id UUID,
  user5_id UUID,
  date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Get profile ID from auth user ID
  SELECT p.id INTO profile_id
  FROM profiles p
  WHERE p.user_id = auth_user_id;
  
  -- Return the trio for this profile
  RETURN QUERY
  SELECT t.*
  FROM trios t
  WHERE t.date = target_date
    AND (t.user1_id = profile_id 
      OR t.user2_id = profile_id 
      OR t.user3_id = profile_id
      OR t.user4_id = profile_id
      OR t.user5_id = profile_id);
END;
$$;

-- Function to create daily trios
CREATE OR REPLACE FUNCTION create_daily_trios()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  trio_count INT := 0;
  users_assigned INT := 0;
BEGIN
  -- Delete existing trios for today
  DELETE FROM trios WHERE date = CURRENT_DATE;
  
  -- Create new trios (groups of 3)
  WITH shuffled_users AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
    FROM profiles
    WHERE id IS NOT NULL
  ),
  grouped_users AS (
    SELECT 
      id,
      ((rn - 1) / 3) + 1 as trio_group,
      ((rn - 1) % 3) + 1 as position_in_trio
    FROM shuffled_users
  )
  INSERT INTO trios (user1_id, user2_id, user3_id, date)
  SELECT 
    MAX(CASE WHEN position_in_trio = 1 THEN id END),
    MAX(CASE WHEN position_in_trio = 2 THEN id END),
    MAX(CASE WHEN position_in_trio = 3 THEN id END),
    CURRENT_DATE
  FROM grouped_users
  GROUP BY trio_group
  HAVING COUNT(*) >= 3;
  
  -- Get counts
  SELECT COUNT(*) INTO trio_count FROM trios WHERE date = CURRENT_DATE;
  users_assigned := trio_count * 3;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'trios_created', trio_count,
    'users_assigned', users_assigned,
    'date', CURRENT_DATE
  );
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM profiles
  WHERE user_id = auth_user_id;
  
  RETURN COALESCE(admin_status, false);
END;
$$;

-- ============================================
-- 4. FIX ROW LEVEL SECURITY
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

DROP POLICY IF EXISTS "Public read access" ON trios;
DROP POLICY IF EXISTS "Authenticated users can view trios" ON trios;
DROP POLICY IF EXISTS "System can create trios" ON trios;
DROP POLICY IF EXISTS "System can update trios" ON trios;
DROP POLICY IF EXISTS "System can delete trios" ON trios;

-- Create clean policies for profiles
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create clean policies for trios
CREATE POLICY "Anyone can read trios"
  ON trios FOR SELECT
  USING (true);

CREATE POLICY "System can manage trios"
  ON trios FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for replies
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read replies"
  ON replies FOR SELECT
  USING (true);

CREATE POLICY "Users can create replies"
  ON replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. CREATE TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END;
$$;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_trio_for_date TO authenticated;
GRANT EXECUTE ON FUNCTION create_daily_trios TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin TO authenticated;

-- ============================================
-- 7. CREATE TODAY'S TRIOS
-- ============================================

-- Create trios for today
SELECT create_daily_trios();

-- ============================================
-- 8. VERIFY SETUP
-- ============================================

-- Check results
SELECT 
  'Profiles' as table_name, 
  COUNT(*) as count 
FROM profiles
UNION ALL
SELECT 
  'Trios Today' as table_name, 
  COUNT(*) as count 
FROM trios 
WHERE date = CURRENT_DATE
UNION ALL
SELECT 
  'Admins' as table_name, 
  COUNT(*) as count 
FROM profiles 
WHERE is_admin = true;