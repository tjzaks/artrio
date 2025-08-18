-- Content Moderation System for Artrio
-- Ensures clean, appropriate content for high school environment

-- Table for storing blocked words and phrases
CREATE TABLE IF NOT EXISTS public.blocked_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  category TEXT, -- 'profanity', 'slur', 'sexual', 'violence', 'bullying', 'drugs'
  severity INTEGER DEFAULT 1, -- 1-5, where 5 is most severe
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for content moderation logs
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'bio', 'post', 'comment', 'username'
  content TEXT NOT NULL,
  original_content TEXT, -- Store original if modified
  action_taken TEXT NOT NULL, -- 'blocked', 'modified', 'flagged', 'approved'
  reason TEXT,
  moderation_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user moderation history (track repeat offenders)
CREATE TABLE IF NOT EXISTS public.user_moderation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  violation_count INTEGER DEFAULT 0,
  last_violation TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'good_standing', -- 'good_standing', 'warned', 'restricted', 'banned'
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_moderation_logs_user_id ON moderation_logs(user_id);
CREATE INDEX idx_moderation_logs_created_at ON moderation_logs(created_at DESC);
CREATE INDEX idx_user_moderation_history_user_id ON user_moderation_history(user_id);

-- Function to check if content is appropriate
CREATE OR REPLACE FUNCTION check_content_appropriate(
  p_content TEXT,
  p_content_type TEXT DEFAULT 'general'
)
RETURNS JSON AS $$
DECLARE
  v_is_appropriate BOOLEAN := true;
  v_reason TEXT := '';
  v_cleaned_content TEXT;
  v_word TEXT;
BEGIN
  -- Normalize content for checking
  v_cleaned_content := LOWER(TRIM(p_content));
  
  -- Remove special characters that might be used to bypass
  v_cleaned_content := REGEXP_REPLACE(v_cleaned_content, '[^a-z0-9\s]', '', 'g');
  
  -- Check for excessive caps (aggression)
  IF LENGTH(p_content) > 5 AND 
     LENGTH(REGEXP_REPLACE(p_content, '[^A-Z]', '', 'g')) > LENGTH(p_content) * 0.7 THEN
    v_is_appropriate := false;
    v_reason := 'Excessive capitalization';
  END IF;
  
  -- Check for spam patterns
  IF v_cleaned_content ~ '(.)\1{5,}' THEN
    v_is_appropriate := false;
    v_reason := 'Spam pattern detected';
  END IF;
  
  -- Check against blocked words
  FOR v_word IN SELECT word FROM blocked_words
  LOOP
    IF v_cleaned_content LIKE '%' || v_word || '%' THEN
      v_is_appropriate := false;
      v_reason := 'Contains inappropriate language';
      EXIT;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'is_appropriate', v_is_appropriate,
    'reason', v_reason,
    'content_type', p_content_type
  );
END;
$$ LANGUAGE plpgsql;

-- Function to moderate user bio
CREATE OR REPLACE FUNCTION moderate_bio_content()
RETURNS TRIGGER AS $$
DECLARE
  v_check_result JSON;
  v_user_history RECORD;
BEGIN
  -- Check if bio contains inappropriate content
  v_check_result := check_content_appropriate(NEW.bio, 'bio');
  
  IF NOT (v_check_result->>'is_appropriate')::BOOLEAN THEN
    -- Log the moderation action
    INSERT INTO moderation_logs (
      user_id, 
      content_type, 
      content, 
      original_content,
      action_taken, 
      reason
    ) VALUES (
      NEW.user_id,
      'bio',
      'Content blocked',
      NEW.bio,
      'blocked',
      v_check_result->>'reason'
    );
    
    -- Update user moderation history
    INSERT INTO user_moderation_history (user_id, violation_count, last_violation)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET violation_count = user_moderation_history.violation_count + 1,
        last_violation = NOW(),
        status = CASE 
          WHEN user_moderation_history.violation_count >= 5 THEN 'restricted'
          WHEN user_moderation_history.violation_count >= 2 THEN 'warned'
          ELSE 'good_standing'
        END;
    
    -- Reject the update
    RAISE EXCEPTION 'Bio contains inappropriate content. Please keep it clean!';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to moderate posts
CREATE OR REPLACE FUNCTION moderate_post_content()
RETURNS TRIGGER AS $$
DECLARE
  v_check_result JSON;
BEGIN
  -- Skip moderation check if content is null (media-only posts)
  IF NEW.content IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check content
  v_check_result := check_content_appropriate(NEW.content, 'post');
  
  IF NOT (v_check_result->>'is_appropriate')::BOOLEAN THEN
    -- Log the moderation action
    INSERT INTO moderation_logs (
      user_id, 
      content_type, 
      content,
      original_content, 
      action_taken, 
      reason
    ) VALUES (
      NEW.user_id,
      'post',
      'Content blocked',
      NEW.content,
      'blocked',
      v_check_result->>'reason'
    );
    
    -- Update user moderation history
    INSERT INTO user_moderation_history (user_id, violation_count, last_violation)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET violation_count = user_moderation_history.violation_count + 1,
        last_violation = NOW();
    
    -- Reject the post
    RAISE EXCEPTION 'Post contains inappropriate content. Please keep it clean!';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for content moderation
CREATE TRIGGER moderate_bio_before_update
  BEFORE UPDATE OF bio ON profiles
  FOR EACH ROW
  WHEN (NEW.bio IS DISTINCT FROM OLD.bio AND NEW.bio IS NOT NULL)
  EXECUTE FUNCTION moderate_bio_content();

CREATE TRIGGER moderate_bio_before_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.bio IS NOT NULL)
  EXECUTE FUNCTION moderate_bio_content();

CREATE TRIGGER moderate_post_before_insert
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION moderate_post_content();

CREATE TRIGGER moderate_post_before_update
  BEFORE UPDATE OF content ON posts
  FOR EACH ROW
  WHEN (NEW.content IS DISTINCT FROM OLD.content)
  EXECUTE FUNCTION moderate_post_content();

-- Insert some basic blocked words (keeping it minimal and appropriate)
-- In production, this would be a comprehensive list
INSERT INTO blocked_words (word, category, severity) VALUES
  ('hate', 'bullying', 3),
  ('kill', 'violence', 4),
  ('drug', 'drugs', 3),
  ('die', 'violence', 3)
ON CONFLICT (word) DO NOTHING;

-- RLS Policies
ALTER TABLE blocked_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_moderation_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify blocked words
CREATE POLICY "Admins can manage blocked words" ON blocked_words
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can view all moderation logs, users can view their own
CREATE POLICY "View moderation logs" ON moderation_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users can view their own moderation history
CREATE POLICY "View own moderation history" ON user_moderation_history
  FOR SELECT USING (user_id = auth.uid());

-- Admins can view and update all moderation history
CREATE POLICY "Admins manage moderation history" ON user_moderation_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );