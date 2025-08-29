-- Add unique constraint to phone_number column in profiles table
-- This ensures no two users can have the same phone number

-- First, let's check for any duplicate phone numbers and clean them up
-- (keeping the oldest account with that number)
WITH duplicates AS (
  SELECT 
    user_id,
    phone_number,
    ROW_NUMBER() OVER (PARTITION BY phone_number ORDER BY created_at) as rn
  FROM profiles
  WHERE phone_number IS NOT NULL AND phone_number != ''
)
UPDATE profiles
SET phone_number = NULL
WHERE user_id IN (
  SELECT user_id 
  FROM duplicates 
  WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE profiles
ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number)
WHERE phone_number IS NOT NULL;