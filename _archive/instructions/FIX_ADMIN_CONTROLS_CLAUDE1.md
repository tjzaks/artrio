# URGENT: Fix Admin System Controls - Claude 1 Backend

## Your Task: Fix the Backend API Endpoints

The admin dashboard has 4 broken system controls. You need to create/fix the backend API endpoints and database functions.

## Broken Controls:
1. **Randomize Trios** - Create new daily trios
2. **Cleanup Content** - Remove expired posts  
3. **Refresh Profiles** - Update safe profile data
4. **Delete Today's Trios** - Remove current daily trios

## What You Need to Build:

### 1. Randomize Trios Function
Create a Supabase Edge Function or RPC function:
```sql
CREATE OR REPLACE FUNCTION randomize_trios()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Delete existing active trios
  UPDATE trios SET status = 'archived' WHERE status = 'active';
  
  -- Get all active users
  -- Group them into sets of 3
  -- Create new trio records
  -- Return success/failure with trio count
  
  RETURN json_build_object('success', true, 'trios_created', trio_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Cleanup Content Function  
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_content()
RETURNS json AS $$
BEGIN
  -- Delete posts older than 24 hours
  DELETE FROM posts WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Clean up orphaned media
  -- Remove expired trio invites
  
  RETURN json_build_object('success', true, 'cleaned', row_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Refresh Profiles Function
```sql
CREATE OR REPLACE FUNCTION refresh_safe_profiles()  
RETURNS json AS $$
BEGIN
  -- Update profile safe scores
  -- Recalculate user trust levels
  -- Clear inappropriate content flags
  
  RETURN json_build_object('success', true, 'profiles_updated', count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Delete Today's Trios Function
```sql
CREATE OR REPLACE FUNCTION delete_todays_trios()
RETURNS json AS $$
BEGIN
  -- Archive all trios created today
  UPDATE trios 
  SET status = 'deleted', deleted_at = NOW()
  WHERE DATE(created_at) = CURRENT_DATE;
  
  RETURN json_build_object('success', true, 'trios_deleted', count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Endpoints to Create:

In your backend API (Railway app), create these endpoints:

```javascript
// POST /api/admin/randomize-trios
app.post('/api/admin/randomize-trios', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.rpc('randomize_trios');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/admin/cleanup-content
app.post('/api/admin/cleanup-content', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.rpc('cleanup_expired_content');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/admin/refresh-profiles
app.post('/api/admin/refresh-profiles', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.rpc('refresh_safe_profiles');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/admin/delete-todays-trios
app.post('/api/admin/delete-todays-trios', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.rpc('delete_todays_trios');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});
```

## Database Schema You're Working With:

```sql
-- Users/Profiles table exists with:
profiles (id, username, bio, avatar_url, created_at, updated_at)

-- You need to create/verify:
trios (id, member1_id, member2_id, member3_id, status, created_at)
posts (id, user_id, trio_id, content, created_at)
```

## Testing With Our Dummy Users:
- jake_thompson_12
- emma_johnson_12
- ethan_rodriguez_11
- sophia_williams_11
- mason_chen_10
- olivia_davis_10
- logan_brooks_12 (was tyler_brooks_12)
- isabella_garcia_12
- dylan_martinez_11
- beth_mitchell_11 (was ava_mitchell_11)

## Success Criteria:
- [ ] All 4 RPC functions created in Supabase
- [ ] All 4 API endpoints working
- [ ] Proper error handling
- [ ] Admin authentication check
- [ ] Return meaningful success/error messages

## Your Working Directory:
`/Users/tyler/Library/CloudStorage/Dropbox/artrio-claude1`

Commit all changes to branch `claude1` with message: "Fix admin system controls backend"