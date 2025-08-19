-- Create missing critical tables for Artrio production

-- 1. STORIES TABLE (Instagram-like stories for trios)
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

-- 2. TRIO_MEMBERS TABLE (Links users to trios - better than user1/user2/user3)
CREATE TABLE IF NOT EXISTS public.trio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trio_id UUID REFERENCES trios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trio_id, user_id)
);

-- 3. CONVERSATIONS TABLE (For direct messages)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONVERSATION_PARTICIPANTS TABLE (Who's in each conversation)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- 5. MESSAGES TABLE (Individual messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STORY_VIEWS TABLE (Track who viewed stories)
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trio_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- STORIES POLICIES
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

-- TRIO_MEMBERS POLICIES
CREATE POLICY "Anyone can view trio members" ON public.trio_members
  FOR SELECT USING (true);

-- CONVERSATIONS POLICIES
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  );

-- CONVERSATION_PARTICIPANTS POLICIES  
CREATE POLICY "Users can view conversation participants" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

-- MESSAGES POLICIES
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

-- STORY_VIEWS POLICIES
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

-- Update trios table to use a better structure
ALTER TABLE public.trios 
  DROP COLUMN IF EXISTS user1_id,
  DROP COLUMN IF EXISTS user2_id,
  DROP COLUMN IF EXISTS user3_id,
  DROP COLUMN IF EXISTS date,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_trio_id ON stories(trio_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_trio_members_trio_id ON trio_members(trio_id);
CREATE INDEX IF NOT EXISTS idx_trio_members_user_id ON trio_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);