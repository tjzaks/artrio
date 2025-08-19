-- Complete fix for trios table structure
-- This ensures all necessary columns exist

-- First, check what columns currently exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trios'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS user3_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.trios 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraints if they don't exist
DO $$ 
BEGIN
    -- Check and add constraint for user1_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_date_user1'
    ) THEN
        ALTER TABLE public.trios 
        ADD CONSTRAINT unique_date_user1 UNIQUE(date, user1_id);
    END IF;
    
    -- Check and add constraint for user2_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_date_user2'
    ) THEN
        ALTER TABLE public.trios 
        ADD CONSTRAINT unique_date_user2 UNIQUE(date, user2_id);
    END IF;
    
    -- Check and add constraint for user3_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_date_user3'
    ) THEN
        ALTER TABLE public.trios 
        ADD CONSTRAINT unique_date_user3 UNIQUE(date, user3_id);
    END IF;
END $$;

-- Verify the table structure after changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trios'
ORDER BY ordinal_position;