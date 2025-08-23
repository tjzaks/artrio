-- Add phone number field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_number TEXT;

-- Add index for phone number searches (optional but useful for admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- Update the profiles table RLS policies to include phone_number
-- The existing policies should already cover this, but let's make sure phone_number is handled