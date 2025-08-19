-- Create trio queue table for matching waiting users
CREATE TABLE IF NOT EXISTS public.trio_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- For future smart matching
  preferences JSONB DEFAULT '{}',
  
  -- Prevent duplicate entries
  CONSTRAINT unique_user_in_queue UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE trio_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see queue count" ON trio_queue
  FOR SELECT USING (true);

CREATE POLICY "Users can join queue" ON trio_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave queue" ON trio_queue
  FOR DELETE USING (auth.uid() = user_id);

-- Function to join queue and auto-match when 3 people are waiting
CREATE OR REPLACE FUNCTION public.join_trio_queue()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_queue_count INT;
  v_trio_id UUID;
  v_queue_users UUID[];
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get user's profile
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id;
  
  -- Check if already in a trio today
  IF EXISTS (
    SELECT 1 FROM trios 
    WHERE date = CURRENT_DATE 
    AND (user1_id = v_profile_id OR user2_id = v_profile_id OR user3_id = v_profile_id)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already in a trio today');
  END IF;
  
  -- Check if already in queue
  IF EXISTS (SELECT 1 FROM trio_queue WHERE user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already in queue');
  END IF;
  
  -- Add to queue
  INSERT INTO trio_queue (user_id, profile_id)
  VALUES (v_user_id, v_profile_id);
  
  -- Check queue size
  SELECT COUNT(*) INTO v_queue_count FROM trio_queue;
  
  -- If we have 3+ people, create a trio
  IF v_queue_count >= 3 THEN
    -- Get first 3 users from queue
    SELECT ARRAY_AGG(profile_id ORDER BY joined_at) 
    INTO v_queue_users
    FROM (
      SELECT profile_id, joined_at 
      FROM trio_queue 
      ORDER BY joined_at 
      LIMIT 3
    ) sub;
    
    -- Create trio
    INSERT INTO trios (user1_id, user2_id, user3_id, date)
    VALUES (v_queue_users[1], v_queue_users[2], v_queue_users[3], CURRENT_DATE)
    RETURNING id INTO v_trio_id;
    
    -- Remove from queue
    DELETE FROM trio_queue 
    WHERE profile_id = ANY(v_queue_users);
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Trio created!',
      'trio_id', v_trio_id,
      'action', 'trio_created'
    );
  
  -- If only 2 people, create a duo
  ELSIF v_queue_count = 2 THEN
    -- Get both users
    SELECT ARRAY_AGG(profile_id ORDER BY joined_at) 
    INTO v_queue_users
    FROM trio_queue;
    
    -- Create duo (trio with NULL third user)
    INSERT INTO trios (user1_id, user2_id, user3_id, date)
    VALUES (v_queue_users[1], v_queue_users[2], NULL, CURRENT_DATE)
    RETURNING id INTO v_trio_id;
    
    -- Remove from queue
    DELETE FROM trio_queue;
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Duo created! Waiting for third person...',
      'trio_id', v_trio_id,
      'action', 'duo_created'
    );
  
  -- Still waiting
  ELSE
    RETURN json_build_object(
      'success', true, 
      'message', 'Added to queue',
      'queue_position', v_queue_count,
      'action', 'queued'
    );
  END IF;
END;
$$;

-- Function to leave queue
CREATE OR REPLACE FUNCTION public.leave_trio_queue()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM trio_queue WHERE user_id = auth.uid();
  
  IF FOUND THEN
    RETURN json_build_object('success', true, 'message', 'Left queue');
  ELSE
    RETURN json_build_object('success', false, 'error', 'Not in queue');
  END IF;
END;
$$;

-- Function to get queue status
CREATE OR REPLACE FUNCTION public.get_queue_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_in_queue BOOLEAN;
  v_queue_count INT;
  v_position INT;
BEGIN
  -- Check if user is in queue
  v_in_queue := EXISTS(SELECT 1 FROM trio_queue WHERE user_id = auth.uid());
  
  -- Get total queue count
  SELECT COUNT(*) INTO v_queue_count FROM trio_queue;
  
  -- Get user's position if in queue
  IF v_in_queue THEN
    SELECT COUNT(*) INTO v_position
    FROM trio_queue
    WHERE joined_at <= (
      SELECT joined_at FROM trio_queue WHERE user_id = auth.uid()
    );
  ELSE
    v_position := 0;
  END IF;
  
  RETURN json_build_object(
    'in_queue', v_in_queue,
    'queue_count', v_queue_count,
    'position', v_position,
    'needs', 3 - v_queue_count
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.join_trio_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_trio_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_status() TO authenticated;