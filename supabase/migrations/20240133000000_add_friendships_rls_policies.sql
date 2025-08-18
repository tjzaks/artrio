-- Enable RLS on friendships table (if not already enabled)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;

-- Policy for INSERT: Users can send friend requests
CREATE POLICY "Users can insert their own friend requests"
ON public.friendships
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only create friendships where they are the user_id
  user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Policy for SELECT: Users can view friendships they're part of
CREATE POLICY "Users can view their friendships"
ON public.friendships
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  OR
  friend_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Policy for UPDATE: Users can update friendships they're part of
CREATE POLICY "Users can update their friendships"
ON public.friendships
FOR UPDATE
TO authenticated
USING (
  -- Can update if you're the recipient (to accept/decline)
  friend_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  OR
  -- Or if you're the sender (to cancel)
  user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same check for new values
  friend_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Policy for DELETE: Users can delete their own friend requests
CREATE POLICY "Users can delete their friendships"
ON public.friendships
FOR DELETE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  OR
  friend_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);