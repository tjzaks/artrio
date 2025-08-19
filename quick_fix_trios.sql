-- Quick fix for the date column issue
-- Run this in Supabase SQL Editor

-- Add date column if it doesn't exist
ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Test query to verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trios'
ORDER BY ordinal_position;