# Presence Testing Steps

## Step 1: Check Database State
Run these queries in Supabase SQL Editor (one at a time):

```sql
-- 1. Do the columns exist?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('is_online', 'last_seen');
```
Expected: 2 rows (is_online, last_seen)
If missing: Need to run migration

```sql
-- 2. Is realtime enabled?
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'profiles';
```
Expected: 1 row with 'profiles'
If missing: Realtime not enabled

```sql
-- 3. Can we update presence manually?
UPDATE profiles 
SET is_online = true, last_seen = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
RETURNING *;
```
Expected: Update succeeds
If fails: RLS policy issue

## Step 2: Apply the Fix
If any above tests failed, run this migration:

```sql
-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Ensure columns exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_presence 
ON profiles(user_id, is_online, last_seen);

-- Fix RLS policies
DROP POLICY IF EXISTS "Users can update own presence" ON profiles;
CREATE POLICY "Users can update own presence" ON profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## Step 3: Verify the Fix
1. Refresh the app
2. Open Messages page
3. Check browser console for:
   - `[PRESENCE-DB] Updated [user-id]: ONLINE`
   - `[PRESENCE-SYNC] Current online users:`
4. Have another user log in
5. Green dot should appear within 5 seconds