-- COMPLETE PRODUCTION MIGRATION FOR ARTRIO
-- This brings production database to full parity with local development

-- ============================================
-- 1. CORE TABLES FOR TRIOS AND STORIES
-- ============================================

-- Update trios table structure (remove old columns, add new ones)
ALTER TABLE public.trios 
  DROP COLUMN IF EXISTS user1_id,
  DROP COLUMN IF EXISTS user2_id,
  DROP COLUMN IF EXISTS user3_id,
  DROP COLUMN IF EXISTS date;

ALTER TABLE public.trios
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');

-- Create trio_members table for better trio management
CREATE TABLE IF NOT EXISTS public.trio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trio_id UUID REFERENCES trios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trio_id, user_id)
);

-- Create stories table (Instagram-like stories)
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trio_id UUID REFERENCES trios(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) DEFAULT 'image',
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create story_views table
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- ============================================
-- 2. MESSAGING SYSTEM
-- ============================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. USER DATA & SECURITY
-- ============================================

-- Create sensitive_user_data table (for birthdays, etc)
CREATE TABLE IF NOT EXISTS public.sensitive_user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  birthday DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create age_verification_attempts table
CREATE TABLE IF NOT EXISTS public.age_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  birthday_provided DATE,
  passed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ============================================
-- 4. ADMIN & MODERATION
-- ============================================

-- Create admin_logs table (from migration file)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reported_content table
CREATE TABLE IF NOT EXISTS public.reported_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create moderation_actions table
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('warn', 'suspend', 'ban', 'unban', 'delete_content')),
  reason TEXT,
  duration_hours INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ERROR TRACKING
-- ============================================

-- Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ENABLE RLS ON ALL NEW TABLES
-- ============================================

ALTER TABLE public.trio_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE ALL RLS POLICIES
-- ============================================

-- Trio members policies
CREATE POLICY "Anyone can view trio members" ON public.trio_members
  FOR SELECT USING (true);

-- Stories policies
CREATE POLICY "Users can view stories from their trio" ON public.stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trio_members tm
      WHERE tm.trio_id = stories.trio_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create stories for their trio" ON public.stories
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM trio_members tm
      WHERE tm.trio_id = stories.trio_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE USING (auth.uid() = user_id);

-- Story views policies
CREATE POLICY "Story owners can see who viewed" ON public.story_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = story_views.story_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark stories as viewed" ON public.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  );

-- Conversation participants policies
CREATE POLICY "Users can view conversation participants" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Sensitive user data policies
CREATE POLICY "Users can view own sensitive data" ON public.sensitive_user_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sensitive data" ON public.sensitive_user_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensitive data" ON public.sensitive_user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User blocks policies
CREATE POLICY "Users can view their blocks" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove their blocks" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Admin logs policies
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Reported content policies
CREATE POLICY "Users can report content" ON public.reported_content
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their reports" ON public.reported_content
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON public.reported_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Moderation actions policies
CREATE POLICY "Users can view moderation actions against them" ON public.moderation_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all moderation actions" ON public.moderation_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create moderation actions" ON public.moderation_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Error logs policies
CREATE POLICY "Users can insert error logs" ON public.error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view error logs" ON public.error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- 8. CREATE MISSING RPC FUNCTIONS
-- ============================================

-- Function to get conversations for a user
CREATE OR REPLACE FUNCTION get_conversations()
RETURNS TABLE (
  id UUID,
  other_user_id UUID,
  other_username TEXT,
  other_avatar_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    p.user_id as other_user_id,
    p.username as other_username,
    p.avatar_url as other_avatar_url,
    m.content as last_message,
    m.created_at as last_message_at,
    COUNT(CASE WHEN m2.is_read = false AND m2.sender_id != auth.uid() THEN 1 END) as unread_count
  FROM conversations c
  JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = auth.uid()
  JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != auth.uid()
  JOIN profiles p ON cp2.user_id = p.user_id
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN messages m2 ON m2.conversation_id = c.id
  GROUP BY c.id, p.user_id, p.username, p.avatar_url, m.content, m.created_at
  ORDER BY COALESCE(m.created_at, c.created_at) DESC;
END;
$$;

-- Function to clean up expired content
CREATE OR REPLACE FUNCTION cleanup_expired_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired stories
  DELETE FROM stories WHERE expires_at < NOW();
  
  -- Delete expired trios
  DELETE FROM trios WHERE ends_at < NOW();
  
  -- Clean up old error logs (keep 30 days)
  DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Clean up old admin logs (keep 90 days)
  DELETE FROM admin_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Function to delete today's trios (for admin reset)
CREATE OR REPLACE FUNCTION delete_todays_trios()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow admins to run this
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Delete trios created today
  DELETE FROM trios WHERE created_at::date = CURRENT_DATE;
  
  -- Clear the queue
  DELETE FROM trio_queue;
END;
$$;

-- Function to populate safe profiles (without sensitive data)
CREATE OR REPLACE FUNCTION populate_safe_profiles()
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.created_at
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE ub.blocked_id = p.user_id
    AND ub.blocker_id = auth.uid()
  );
END;
$$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_content TO authenticated;
GRANT EXECUTE ON FUNCTION delete_todays_trios TO authenticated;
GRANT EXECUTE ON FUNCTION populate_safe_profiles TO authenticated;

-- ============================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_stories_trio_id ON stories(trio_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_trio_members_trio_id ON trio_members(trio_id);
CREATE INDEX IF NOT EXISTS idx_trio_members_user_id ON trio_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_reported_content_status ON reported_content(status);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user_id ON moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

-- ============================================
-- 10. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Add columns from migrations that might be missing
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS personality_type TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- ============================================
-- DONE! Production database is now complete
-- ============================================