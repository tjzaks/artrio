-- Add personality_type field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personality_type TEXT;

-- Add index for better filtering
CREATE INDEX IF NOT EXISTS idx_profiles_personality_type ON profiles(personality_type);