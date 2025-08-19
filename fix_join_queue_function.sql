-- Fix the join_trio_queue function to handle web authentication properly
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
  -- Get user_id from the profile
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE id = p_profile_id;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid profile');
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
    -- Get first 3 members from queue (fixed syntax)
    SELECT array_agg(user_id ORDER BY joined_at)
    INTO v_members
    FROM (
      SELECT user_id, joined_at 
      FROM trio_queue 
      ORDER BY joined_at 
      LIMIT 3
    ) AS first_three;

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