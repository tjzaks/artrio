-- STEP 1: Diagnose the current trios table structure
-- Run this first to see what columns exist
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trios'
ORDER BY ordinal_position;

-- STEP 2: Check if we have the old or new schema
-- Look for 'members' column (new schema) vs user1_id columns (old schema)
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trios' 
    AND column_name = 'members'
) as has_members_column,
EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trios' 
    AND column_name = 'user1_id'
) as has_user1_column;

-- STEP 3: If the table uses the 'members' array format, recreate it with the proper structure
-- Only run this if the above query shows has_members_column = true

-- Option A: If using members array, drop and recreate
/*
DROP TABLE IF EXISTS trios CASCADE;

CREATE TABLE public.trios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user3_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, user1_id),
  UNIQUE(date, user2_id),
  UNIQUE(date, user3_id)
);

ALTER TABLE trios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trios" ON trios
  FOR SELECT USING (true);
*/

-- Option B: If columns are missing, add them
-- Run this if has_user1_column = false
/*
ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS user3_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE;
*/