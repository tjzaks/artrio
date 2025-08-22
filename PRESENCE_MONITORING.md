# Presence System Monitoring

## Health Checks to Run Weekly

### 1. Database State Check
```sql
-- Run in Supabase SQL Editor
SELECT 
    'Realtime Enabled' as check_name,
    EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) as status
UNION ALL
SELECT 
    'Presence Columns Exist',
    COUNT(*) = 2 
    FROM information_schema.columns
    WHERE table_name = 'profiles' 
    AND column_name IN ('is_online', 'last_seen')
UNION ALL
SELECT 
    'RLS Policies Active',
    COUNT(*) >= 3 
    FROM pg_policies 
    WHERE tablename = 'profiles'
UNION ALL
SELECT 
    'Recent Activity',
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE last_seen > NOW() - INTERVAL '1 hour'
    );
```

## Console Monitoring
Watch for these in browser console:

### ✅ Good Signs:
- `[PRESENCE-SUCCESS] Updated [user-id]`
- `[PRESENCE-SYNC] Current online users: [array]`
- `[PRESENCE-DB-CHANGE] User [id] presence updated`

### ❌ Bad Signs:
- `[PRESENCE-ERROR] Database update failed`
- `Error updating presence: 42501` (RLS policy error)
- `Error updating presence: 42P01` (table doesn't exist)
- No presence logs at all

## Testing Procedure

### Manual Test (Do Monthly):
1. Log in with User A
2. Open browser console
3. Look for: `[PRESENCE-SUCCESS] Updated [user-id]`
4. Log in with User B in different browser
5. Within 5 seconds, User A should see:
   - `[PRESENCE-DB-CHANGE] User [B-id] presence updated: online=true`
   - Green dot appears in UI
6. Log out User B
7. Within 5 seconds, User A should see:
   - `[PRESENCE-DB-CHANGE] User [B-id] presence updated: online=false`
   - Green dot disappears

## If Presence Breaks Again

1. **First:** Check if columns exist
```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('is_online', 'last_seen');
```

2. **Second:** Check if realtime enabled
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

3. **Third:** Re-run the fix
```sql
-- Just run FIX_PRESENCE_PRODUCTION.sql again
```

4. **Fourth:** Check Supabase status
- Visit: https://status.supabase.com
- Check for realtime issues

## Prevention Checklist

- [ ] Before any Supabase upgrade, backup these:
  - Current RLS policies
  - Realtime publication settings
  - Trigger definitions
  
- [ ] After any Supabase upgrade, verify:
  - Realtime still enabled for profiles
  - RLS policies still active
  - Presence updates working

- [ ] Add to deployment checklist:
  - Test presence after each deploy
  - Monitor [PRESENCE-SUCCESS] logs
  - Verify green dots appear/disappear

## Known Issues

1. **Presence delays on iOS**: Can take up to 10 seconds
2. **Stale presence on browser refresh**: User appears offline briefly
3. **Rate limiting**: Too many presence updates can hit Supabase limits

## Emergency Fix

If everything is broken, run this nuclear option:
```sql
-- Reset everything
DROP TRIGGER IF EXISTS update_last_seen_trigger ON profiles;
DROP FUNCTION IF EXISTS update_last_seen();
ALTER TABLE profiles DROP COLUMN IF EXISTS is_online;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_seen;

-- Then run FIX_PRESENCE_PRODUCTION.sql
```