-- Add user4_id and user5_id columns to trios table
-- Run this in your Supabase SQL editor

-- Add the missing columns
ALTER TABLE trios 
ADD COLUMN IF NOT EXISTS user4_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user5_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trios'
ORDER BY ordinal_position;