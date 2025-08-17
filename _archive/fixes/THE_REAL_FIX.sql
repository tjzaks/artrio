-- THE REAL FIX FOR TRIO CREATION
-- The problem: trios table expects auth.users IDs but we're passing profiles IDs

-- Option 1: Fix the foreign keys (RECOMMENDED)
-- Drop existing foreign key constraints
ALTER TABLE trios 
DROP CONSTRAINT IF EXISTS trios_user1_id_fkey,
DROP CONSTRAINT IF EXISTS trios_user2_id_fkey,
DROP CONSTRAINT IF EXISTS trios_user3_id_fkey,
DROP CONSTRAINT IF EXISTS trios_user4_id_fkey,
DROP CONSTRAINT IF EXISTS trios_user5_id_fkey;

-- Add new foreign keys pointing to profiles
ALTER TABLE trios
ADD CONSTRAINT trios_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT trios_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT trios_user3_id_fkey FOREIGN KEY (user3_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add columns for user4 and user5 if they don't exist
ALTER TABLE trios 
ADD COLUMN IF NOT EXISTS user4_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user5_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- OR Option 2: Fix the function to use user_id from profiles
DROP FUNCTION IF EXISTS randomize_trios();

CREATE OR REPLACE FUNCTION randomize_trios()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_ids UUID[];
  trio_count INT := 0;
  users_assigned INT := 0;
  total_users INT := 0;
  i INT;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM auth.users 
  WHERE id IN (SELECT user_id FROM profiles);
  
  IF total_users < 3 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Not enough users. Found %s users, need at least 3', total_users),
      'trios_created', 0,
      'users_assigned', 0,
      'total_users', total_users
    );
  END IF;

  -- Delete existing trios for today
  DELETE FROM trios WHERE date = today_date;
  
  -- Get USER_IDs (not profile IDs!) and randomize
  SELECT ARRAY_AGG(user_id ORDER BY RANDOM()) 
  INTO user_ids
  FROM profiles 
  WHERE user_id IS NOT NULL;
  
  -- Create trios
  i := 1;
  WHILE i + 2 <= array_length(user_ids, 1) LOOP
    INSERT INTO trios (
      user1_id, 
      user2_id, 
      user3_id, 
      created_at, 
      date
    )
    VALUES (
      user_ids[i], 
      user_ids[i+1], 
      user_ids[i+2], 
      NOW(),
      today_date
    );
    
    trio_count := trio_count + 1;
    users_assigned := users_assigned + 3;
    i := i + 3;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'trios_created', trio_count,
    'users_assigned', users_assigned,
    'total_users', total_users
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'trios_created', 0,
      'users_assigned', 0
    );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION randomize_trios() TO authenticated;

-- ALSO: Temporarily disable RLS to test
ALTER TABLE trios DISABLE ROW LEVEL SECURITY;

-- Test it
SELECT randomize_trios();

-- Check if it worked
SELECT * FROM trios WHERE date = CURRENT_DATE;

-- If it worked, re-enable RLS with proper policy
ALTER TABLE trios ENABLE ROW LEVEL SECURITY;

-- Create policy that allows the function to insert
DROP POLICY IF EXISTS "Allow system to create trios" ON trios;
CREATE POLICY "Allow system to create trios" ON trios
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Test again with RLS
SELECT randomize_trios();