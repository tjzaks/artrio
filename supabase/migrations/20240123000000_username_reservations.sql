-- Create username reservations table for temporary username holds during signup
CREATE TABLE IF NOT EXISTS public.username_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  session_id TEXT NOT NULL, -- Browser session identifier
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on username (only one reservation per username at a time)
CREATE UNIQUE INDEX idx_username_reservations_username ON username_reservations(LOWER(username));

-- Create index for cleanup queries
CREATE INDEX idx_username_reservations_expires_at ON username_reservations(expires_at);
CREATE INDEX idx_username_reservations_session_id ON username_reservations(session_id);

-- Function to check if username is available (checks both profiles and reservations)
CREATE OR REPLACE FUNCTION check_username_available(
  p_username TEXT,
  p_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  profile_exists BOOLEAN;
  reservation_exists BOOLEAN;
BEGIN
  -- Check if username exists in profiles
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(p_username)
  ) INTO profile_exists;
  
  IF profile_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Check if username has active reservation by another session
  SELECT EXISTS(
    SELECT 1 FROM username_reservations 
    WHERE LOWER(username) = LOWER(p_username)
    AND expires_at > NOW()
    AND (p_session_id IS NULL OR session_id != p_session_id)
  ) INTO reservation_exists;
  
  RETURN NOT reservation_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to reserve a username
CREATE OR REPLACE FUNCTION reserve_username(
  p_username TEXT,
  p_session_id TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- First cleanup expired reservations for this session
  DELETE FROM username_reservations 
  WHERE session_id = p_session_id 
  OR expires_at < NOW();
  
  -- Check if username is available
  IF NOT check_username_available(p_username, p_session_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Username is not available'
    );
  END IF;
  
  -- Try to insert reservation
  BEGIN
    INSERT INTO username_reservations (username, session_id)
    VALUES (p_username, p_session_id);
    
    RETURN json_build_object(
      'success', true,
      'message', 'Username reserved',
      'expires_at', NOW() + INTERVAL '15 minutes'
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Someone else just reserved it
      RETURN json_build_object(
        'success', false,
        'message', 'Username was just taken'
      );
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to release a username reservation
CREATE OR REPLACE FUNCTION release_username_reservation(
  p_username TEXT,
  p_session_id TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM username_reservations 
  WHERE LOWER(username) = LOWER(p_username)
  AND session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Automatic cleanup of expired reservations (runs every hour)
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS VOID AS $$
BEGIN
  DELETE FROM username_reservations 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to cleanup expired reservations (if pg_cron is available)
-- Note: This requires pg_cron extension. If not available, you'll need to call cleanup manually
-- or implement cleanup in your application layer

-- RLS Policies
ALTER TABLE username_reservations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to check/reserve usernames (handled by functions)
CREATE POLICY "Public can use reservation functions" ON username_reservations
  FOR ALL USING (true);