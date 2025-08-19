-- Create trio queue table for matching users
CREATE TABLE IF NOT EXISTS public.trio_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.trio_queue ENABLE ROW LEVEL SECURITY;

-- Users can see the queue
CREATE POLICY "Users can view queue" ON public.trio_queue
  FOR SELECT USING (true);

-- Users can join the queue (only themselves)
CREATE POLICY "Users can join queue" ON public.trio_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can leave the queue (only themselves)
CREATE POLICY "Users can leave queue" ON public.trio_queue
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to join queue
CREATE OR REPLACE FUNCTION join_trio_queue(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_queue_count INT;
  v_trio_id UUID;
  v_members UUID[];
BEGIN
  -- Get the current user id
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already in queue
  IF EXISTS (SELECT 1 FROM trio_queue WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in queue');
  END IF;

  -- Check if already in a trio
  IF EXISTS (
    SELECT 1 FROM trios t
    JOIN trio_members tm ON t.id = tm.trio_id
    WHERE tm.user_id = v_user_id
    AND t.ends_at > NOW()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in a trio');
  END IF;

  -- Add to queue
  INSERT INTO trio_queue (user_id, profile_id)
  VALUES (v_user_id, p_profile_id);

  -- Check queue count
  SELECT COUNT(*) INTO v_queue_count FROM trio_queue;

  -- If we have 3 or more people, create a trio
  IF v_queue_count >= 3 THEN
    -- Get first 3 members from queue
    SELECT array_agg(user_id ORDER BY joined_at LIMIT 3)
    INTO v_members
    FROM trio_queue;

    -- Create the trio
    INSERT INTO trios (id, created_at, ends_at)
    VALUES (gen_random_uuid(), NOW(), NOW() + INTERVAL '24 hours')
    RETURNING id INTO v_trio_id;

    -- Add members to trio
    INSERT INTO trio_members (trio_id, user_id, profile_id)
    SELECT v_trio_id, q.user_id, q.profile_id
    FROM trio_queue q
    WHERE q.user_id = ANY(v_members);

    -- Remove matched users from queue
    DELETE FROM trio_queue
    WHERE user_id = ANY(v_members);

    RETURN jsonb_build_object(
      'success', true, 
      'matched', true, 
      'trio_id', v_trio_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'matched', false, 
    'queue_position', v_queue_count
  );
END;
$$;

-- Create function to leave queue
CREATE OR REPLACE FUNCTION leave_trio_queue()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM trio_queue WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create function to get queue status
CREATE OR REPLACE FUNCTION get_queue_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_in_queue BOOLEAN;
  v_queue_count INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT EXISTS(SELECT 1 FROM trio_queue WHERE user_id = v_user_id)
  INTO v_in_queue;

  SELECT COUNT(*) INTO v_queue_count FROM trio_queue;

  RETURN jsonb_build_object(
    'success', true,
    'in_queue', v_in_queue,
    'queue_count', v_queue_count
  );
END;
$$;