-- Friends and Stories System for Artrio

-- Friends table (bidirectional friendships)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Stories table
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 0
);

-- Story views tracking
CREATE TABLE public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Story reactions
CREATE TABLE public.story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction TEXT NOT NULL, -- emoji or quick reaction
  message TEXT, -- optional reaction message
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Direct messages table
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DM conversation limits (prevent spam)
CREATE TABLE public.dm_conversation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  initiated_by UUID REFERENCES auth.users(id) NOT NULL,
  is_accepted BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Indexes for performance
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
CREATE INDEX idx_story_views_story_id ON story_views(story_id);
CREATE INDEX idx_story_reactions_story_id ON story_reactions(story_id);
CREATE INDEX idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient ON direct_messages(recipient_id);
CREATE INDEX idx_dm_conversation_users ON dm_conversation_status(user1_id, user2_id);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversation_status ENABLE ROW LEVEL SECURITY;

-- Friendship policies
CREATE POLICY "Users can view their friendships" ON friendships
  FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can send friend requests" ON friendships
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can accept friend requests" ON friendships
  FOR UPDATE USING (friend_id = auth.uid() AND status = 'pending');

-- Stories policies
CREATE POLICY "Users can view stories from friends and trio members" ON stories
  FOR SELECT USING (
    user_id = auth.uid() OR
    -- Friend's stories
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND friend_id = stories.user_id) OR
           (friend_id = auth.uid() AND user_id = stories.user_id))
    ) OR
    -- Trio member's stories
    EXISTS (
      SELECT 1 FROM trios t
      WHERE t.date = CURRENT_DATE
      AND (
        (t.user1_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND 
         stories.user_id IN (
           SELECT user_id FROM profiles WHERE id IN (t.user2_id, t.user3_id)
         )) OR
        (t.user2_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND 
         stories.user_id IN (
           SELECT user_id FROM profiles WHERE id IN (t.user1_id, t.user3_id)
         )) OR
        (t.user3_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND 
         stories.user_id IN (
           SELECT user_id FROM profiles WHERE id IN (t.user1_id, t.user2_id)
         ))
      )
    )
  );

CREATE POLICY "Users can create their own stories" ON stories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own stories" ON stories
  FOR DELETE USING (user_id = auth.uid());

-- Story views policies
CREATE POLICY "Users can view story view counts" ON story_views
  FOR SELECT USING (true);

CREATE POLICY "Users can mark stories as viewed" ON story_views
  FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- Story reactions policies
CREATE POLICY "Users can view reactions" ON story_reactions
  FOR SELECT USING (
    -- Can see reactions on your own stories
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_reactions.story_id AND stories.user_id = auth.uid()) OR
    -- Can see your own reactions
    user_id = auth.uid()
  );

CREATE POLICY "Users can add reactions" ON story_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Direct messages policies
CREATE POLICY "Users can view their messages" ON direct_messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON direct_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    -- Check if conversation is allowed
    EXISTS (
      SELECT 1 FROM dm_conversation_status
      WHERE ((user1_id = LEAST(sender_id, recipient_id) AND 
              user2_id = GREATEST(sender_id, recipient_id)) AND
             (is_accepted = true OR initiated_by = sender_id))
    )
  );

-- DM conversation status policies
CREATE POLICY "Users can view their conversation status" ON dm_conversation_status
  FOR SELECT USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can initiate conversations" ON dm_conversation_status
  FOR INSERT WITH CHECK (initiated_by = auth.uid());

CREATE POLICY "Recipients can accept conversations" ON dm_conversation_status
  FOR UPDATE USING (
    (user1_id = auth.uid() OR user2_id = auth.uid()) AND
    initiated_by != auth.uid()
  );

-- Function to get friend suggestions
CREATE OR REPLACE FUNCTION get_friend_suggestions(p_user_id UUID)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  avatar_url TEXT,
  mutual_trios INTEGER,
  suggestion_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT id FROM profiles WHERE user_id = p_user_id LIMIT 1
  ),
  past_trio_members AS (
    -- People you've been in trios with
    SELECT DISTINCT 
      CASE 
        WHEN t.user1_id = up.id THEN unnest(ARRAY[t.user2_id, t.user3_id])
        WHEN t.user2_id = up.id THEN unnest(ARRAY[t.user1_id, t.user3_id])
        WHEN t.user3_id = up.id THEN unnest(ARRAY[t.user1_id, t.user2_id])
      END as member_id
    FROM trios t, user_profile up
    WHERE up.id IN (t.user1_id, t.user2_id, t.user3_id)
  ),
  existing_friends AS (
    -- Already friends or pending
    SELECT 
      CASE 
        WHEN user_id = p_user_id THEN friend_id
        ELSE user_id
      END as friend_profile_id
    FROM friendships
    WHERE (user_id = (SELECT id FROM user_profile) OR 
           friend_id = (SELECT id FROM user_profile))
  )
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    COUNT(ptm.member_id)::INTEGER as mutual_trios,
    'Past trio member' as suggestion_reason
  FROM profiles p
  INNER JOIN past_trio_members ptm ON p.id = ptm.member_id
  WHERE p.id NOT IN (SELECT friend_profile_id FROM existing_friends)
    AND p.id != (SELECT id FROM user_profile)
  GROUP BY p.id, p.username, p.avatar_url
  ORDER BY mutual_trios DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if DM is allowed
CREATE OR REPLACE FUNCTION can_send_dm(p_sender_id UUID, p_recipient_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_conversation RECORD;
  v_message_count INTEGER;
BEGIN
  -- Check if conversation exists
  SELECT * INTO v_conversation
  FROM dm_conversation_status
  WHERE user1_id = LEAST(p_sender_id, p_recipient_id)
    AND user2_id = GREATEST(p_sender_id, p_recipient_id);
  
  IF NOT FOUND THEN
    -- No conversation yet, can send first message
    RETURN TRUE;
  END IF;
  
  -- If conversation is accepted, can send freely
  IF v_conversation.is_accepted THEN
    RETURN TRUE;
  END IF;
  
  -- If sender initiated and no response yet, can't send more
  IF v_conversation.initiated_by = p_sender_id THEN
    -- Check if recipient has responded
    SELECT COUNT(*) INTO v_message_count
    FROM direct_messages
    WHERE sender_id = p_recipient_id AND recipient_id = p_sender_id;
    
    RETURN v_message_count > 0;
  END IF;
  
  -- Recipient can always respond
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle sending a DM
CREATE OR REPLACE FUNCTION send_direct_message(
  p_recipient_id UUID,
  p_content TEXT,
  p_media_url TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_id UUID;
  v_can_send BOOLEAN;
  v_message_id UUID;
  v_conversation RECORD;
BEGIN
  v_sender_id := auth.uid();
  
  -- Check if can send
  v_can_send := can_send_dm(v_sender_id, p_recipient_id);
  
  IF NOT v_can_send THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You must wait for a response before sending another message'
    );
  END IF;
  
  -- Create or update conversation status
  INSERT INTO dm_conversation_status (
    user1_id, user2_id, initiated_by, last_message_at
  ) VALUES (
    LEAST(v_sender_id, p_recipient_id),
    GREATEST(v_sender_id, p_recipient_id),
    v_sender_id,
    NOW()
  )
  ON CONFLICT (user1_id, user2_id) DO UPDATE
  SET last_message_at = NOW(),
      is_accepted = CASE 
        WHEN dm_conversation_status.initiated_by != v_sender_id THEN TRUE
        ELSE dm_conversation_status.is_accepted
      END;
  
  -- Insert message
  INSERT INTO direct_messages (
    sender_id, recipient_id, content, media_url, media_type
  ) VALUES (
    v_sender_id, p_recipient_id, p_content, p_media_url, p_media_type
  ) RETURNING id INTO v_message_id;
  
  RETURN json_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_friend_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION can_send_dm TO authenticated;
GRANT EXECUTE ON FUNCTION send_direct_message TO authenticated;