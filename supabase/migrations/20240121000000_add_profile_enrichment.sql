-- Add enrichment fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vibes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS friend_type TEXT,
ADD COLUMN IF NOT EXISTS excited_about TEXT,
ADD COLUMN IF NOT EXISTS conversation_style TEXT,
ADD COLUMN IF NOT EXISTS chat_time TEXT,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Add indexes for better matching
CREATE INDEX IF NOT EXISTS idx_profiles_vibes ON profiles USING GIN(vibes);
CREATE INDEX IF NOT EXISTS idx_profiles_chat_time ON profiles(chat_time);
CREATE INDEX IF NOT EXISTS idx_profiles_conversation_style ON profiles(conversation_style);

-- Create a function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  profile_record profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = profile_id;
  
  -- Basic info (30%)
  IF profile_record.username IS NOT NULL THEN completion_score := completion_score + 10; END IF;
  IF profile_record.bio IS NOT NULL THEN completion_score := completion_score + 10; END IF;
  IF profile_record.avatar_url IS NOT NULL THEN completion_score := completion_score + 10; END IF;
  
  -- Personality info (50%)
  IF array_length(profile_record.vibes, 1) > 0 THEN completion_score := completion_score + 15; END IF;
  IF profile_record.friend_type IS NOT NULL THEN completion_score := completion_score + 10; END IF;
  IF profile_record.excited_about IS NOT NULL THEN completion_score := completion_score + 15; END IF;
  IF profile_record.conversation_style IS NOT NULL THEN completion_score := completion_score + 10; END IF;
  
  -- Preferences (20%)
  IF profile_record.chat_time IS NOT NULL THEN completion_score := completion_score + 20; END IF;
  
  RETURN completion_score;
END;
$$ LANGUAGE plpgsql;

-- Create a view for matching users with similar vibes
CREATE OR REPLACE VIEW profile_matches AS
SELECT 
  p1.user_id as user1_id,
  p2.user_id as user2_id,
  p1.vibes && p2.vibes as has_common_vibes,
  array_length(array(SELECT unnest(p1.vibes) INTERSECT SELECT unnest(p2.vibes)), 1) as common_vibes_count,
  p1.chat_time = p2.chat_time as same_chat_time,
  p1.conversation_style = p2.conversation_style as same_conversation_style
FROM profiles p1
CROSS JOIN profiles p2
WHERE p1.user_id != p2.user_id;