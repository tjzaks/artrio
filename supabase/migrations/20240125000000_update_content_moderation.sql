-- Update content moderation to be less restrictive
-- Only filter actual explicit language, not everything

-- Clear existing overly restrictive words
DELETE FROM blocked_words;

-- Insert only actual explicit words that should be filtered
INSERT INTO blocked_words (word, category, severity) VALUES
  -- Major profanity (will be replaced with asterisks)
  ('fuck', 'profanity', 5),
  ('shit', 'profanity', 3),
  ('bitch', 'profanity', 4),
  ('ass', 'profanity', 2),
  ('damn', 'profanity', 1),
  ('dick', 'profanity', 4),
  ('cock', 'profanity', 5),
  ('pussy', 'profanity', 5),
  ('piss', 'profanity', 2),
  
  -- Sexual content
  ('porn', 'sexual', 5),
  ('sex', 'sexual', 3),
  ('nude', 'sexual', 4),
  ('nsfw', 'sexual', 4),
  
  -- Slurs (these get blocked, not just filtered)
  ('nigger', 'slur', 5),
  ('nigga', 'slur', 5),
  ('faggot', 'slur', 5),
  ('retard', 'slur', 4),
  ('tranny', 'slur', 5),
  
  -- Extreme content (blocked entirely)
  ('kys', 'violence', 5),
  ('kms', 'violence', 5)
ON CONFLICT (word) DO NOTHING;

-- Update the moderation function to filter instead of block for most words
CREATE OR REPLACE FUNCTION filter_content(
  p_content TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_filtered TEXT := p_content;
  v_word RECORD;
  v_pattern TEXT;
  v_replacement TEXT;
BEGIN
  -- Loop through blocked words
  FOR v_word IN 
    SELECT word, severity 
    FROM blocked_words 
    WHERE category IN ('profanity', 'sexual')
    ORDER BY LENGTH(word) DESC  -- Replace longer words first
  LOOP
    -- Create case-insensitive pattern
    v_pattern := '(?i)\b' || v_word.word || '\b';
    
    -- Create replacement with asterisks (keep first letter)
    v_replacement := SUBSTRING(v_word.word, 1, 1) || REPEAT('*', LENGTH(v_word.word) - 1);
    
    -- Replace all occurrences
    v_filtered := REGEXP_REPLACE(v_filtered, v_pattern, v_replacement, 'gi');
  END LOOP;
  
  RETURN v_filtered;
END;
$$ LANGUAGE plpgsql;

-- Update moderation to filter instead of block for most content
CREATE OR REPLACE FUNCTION moderate_content_v2(
  p_content TEXT,
  p_content_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_filtered TEXT;
  v_should_block BOOLEAN := false;
  v_reason TEXT := '';
  v_word TEXT;
BEGIN
  -- Check for slurs and extreme content (these get blocked entirely)
  FOR v_word IN 
    SELECT word FROM blocked_words 
    WHERE category IN ('slur', 'violence') AND severity >= 4
  LOOP
    IF LOWER(p_content) ~ ('(?i)\b' || v_word || '\b') THEN
      v_should_block := true;
      v_reason := 'Content contains hate speech or extreme content';
      EXIT;
    END IF;
  END LOOP;
  
  -- If not blocked, filter the profanity
  IF NOT v_should_block THEN
    v_filtered := filter_content(p_content);
  ELSE
    v_filtered := p_content;  -- Keep original if blocking
  END IF;
  
  RETURN json_build_object(
    'should_block', v_should_block,
    'filtered_content', v_filtered,
    'reason', v_reason,
    'modified', v_filtered != p_content
  );
END;
$$ LANGUAGE plpgsql;

-- Update bio moderation trigger to filter instead of block
CREATE OR REPLACE FUNCTION moderate_bio_content()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Skip if bio is null or empty
  IF NEW.bio IS NULL OR LENGTH(TRIM(NEW.bio)) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Check and filter content
  v_result := moderate_content_v2(NEW.bio, 'bio');
  
  -- If it should be blocked entirely (slurs, hate speech)
  IF (v_result->>'should_block')::BOOLEAN THEN
    -- Log it
    INSERT INTO moderation_logs (
      user_id, content_type, content, original_content,
      action_taken, reason
    ) VALUES (
      NEW.user_id, 'bio', 'BLOCKED', NEW.bio,
      'blocked', v_result->>'reason'
    );
    
    RAISE EXCEPTION 'Content contains inappropriate language that cannot be used.';
  END IF;
  
  -- If content was modified (profanity filtered)
  IF (v_result->>'modified')::BOOLEAN THEN
    NEW.bio := v_result->>'filtered_content';
    
    -- Log the filtering
    INSERT INTO moderation_logs (
      user_id, content_type, content, original_content,
      action_taken, reason
    ) VALUES (
      NEW.user_id, 'bio', NEW.bio, OLD.bio,
      'filtered', 'Profanity automatically filtered'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update post moderation to filter instead of block
CREATE OR REPLACE FUNCTION moderate_post_content()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Skip moderation for DMs
  IF NEW.is_dm = true OR NEW.chat_type = 'dm' THEN
    RETURN NEW;
  END IF;
  
  -- Check and filter content
  v_result := moderate_content_v2(NEW.content, 'post');
  
  -- If it should be blocked entirely (slurs, hate speech)
  IF (v_result->>'should_block')::BOOLEAN THEN
    INSERT INTO moderation_logs (
      user_id, content_type, content, original_content,
      action_taken, reason
    ) VALUES (
      NEW.user_id, 'post', 'BLOCKED', NEW.content,
      'blocked', v_result->>'reason'
    );
    
    RAISE EXCEPTION 'Post contains inappropriate content that cannot be posted.';
  END IF;
  
  -- If content was modified (profanity filtered)
  IF (v_result->>'modified')::BOOLEAN THEN
    NEW.content := v_result->>'filtered_content';
    
    -- Optionally log (might be too much for posts)
    -- Could add a notification to user that their post was filtered
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;