-- Create friendships table for friend connections
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create friend_requests table (for easier tracking)
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    friend_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their friendships" ON public.friendships
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    friend_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Friend requests policies
CREATE POLICY "Users can view friend requests" ON public.friend_requests
  FOR SELECT USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

CREATE POLICY "Users can send friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can respond to friend requests" ON public.friend_requests
  FOR UPDATE USING (to_user_id = auth.uid());

-- Function to get friend suggestions (people from past trios)
CREATE OR REPLACE FUNCTION get_friend_suggestions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.username,
    p.avatar_url
  FROM profiles p
  WHERE p.user_id IN (
    -- Get users who were in same trios
    SELECT DISTINCT tm2.user_id
    FROM trio_members tm1
    JOIN trio_members tm2 ON tm1.trio_id = tm2.trio_id
    WHERE tm1.user_id = p_user_id
    AND tm2.user_id != p_user_id
  )
  AND p.user_id NOT IN (
    -- Exclude existing friends
    SELECT 
      CASE 
        WHEN f.user_id = prof.id THEN f.friend_id 
        ELSE f.user_id 
      END
    FROM friendships f
    JOIN profiles prof ON prof.user_id = p_user_id
    WHERE (f.user_id = prof.id OR f.friend_id = prof.id)
    AND f.status = 'accepted'
  )
  LIMIT 10;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_friend_suggestions TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);