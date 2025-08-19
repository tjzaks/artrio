# URGENT: Apply Friends Migration to Production

The "Add Friend" button won't work until you apply this migration!

## Quick Steps:

1. **Go to Supabase SQL Editor:**
   https://supabase.com/dashboard/project/siqmwgeriobtlnkxfeas/sql/new

2. **Copy the ENTIRE contents of `create_friends_system.sql`**

3. **Paste it in the SQL Editor**

4. **Click "Run"**

## What this creates:
- `friendships` table - stores friend connections
- `friend_requests` table - tracks pending requests  
- RLS policies for security
- `get_friend_suggestions` function
- Performance indexes

## Verify it worked:
After running, you should see "Success. No rows returned" and the Add Friend button will start working immediately.

## Alternative: Use this simplified version

If the full migration has issues, use this minimal version:

```sql
-- Create friendships table
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

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    friend_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their friendships" ON public.friendships
  FOR UPDATE USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    friend_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
```