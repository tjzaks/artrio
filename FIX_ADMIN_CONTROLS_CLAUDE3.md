# URGENT: Fix Admin System Controls - Claude 3 Testing

## Your Task: Test & Verify System Controls

Claude 1 is fixing the backend and Claude 2 is fixing the frontend. You need to test everything works correctly.

## System Controls to Test:
1. **Randomize Trios** - Should create new trios from available users
2. **Cleanup Content** - Should remove old posts/content
3. **Refresh Profiles** - Should update profile data
4. **Delete Today's Trios** - Should remove all trios created today

## Testing Plan:

### 1. Pre-Testing Setup
```javascript
// Check current state before testing
async function checkInitialState() {
  // Count existing trios
  const { data: trios } = await supabase
    .from('trios')
    .select('*')
    .eq('status', 'active');
  console.log('Active trios before:', trios?.length);
  
  // Count users with profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');
  console.log('Total profiles:', profiles?.length);
  
  // Check for old content
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .lt('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
  console.log('Old posts to clean:', posts?.length);
}
```

### 2. Test Randomize Trios
```javascript
// Test Cases:
// 1. With 13 users, should create 4 trios (12 users, 1 waiting)
// 2. Should mark old trios as archived
// 3. Should handle when users already in trios
// 4. Should return success with trio count

async function testRandomizeTrios() {
  // Call the endpoint
  const response = await fetch('/api/admin/randomize-trios', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Verify response
  assert(response.ok, 'Should return 200');
  const data = await response.json();
  assert(data.success === true, 'Should return success');
  assert(data.trios_created > 0, 'Should create at least 1 trio');
  
  // Verify in database
  const { data: newTrios } = await supabase
    .from('trios')
    .select('*')
    .eq('status', 'active');
  assert(newTrios.length === Math.floor(13/3), 'Should create correct number of trios');
}
```

### 3. Test Cleanup Content
```javascript
// Test Cases:
// 1. Should delete posts older than 24 hours
// 2. Should keep recent posts
// 3. Should return count of cleaned items

async function testCleanupContent() {
  // Create test data - old post
  await supabase.from('posts').insert({
    content: 'Old test post',
    created_at: new Date(Date.now() - 25*60*60*1000).toISOString()
  });
  
  // Create recent post
  await supabase.from('posts').insert({
    content: 'Recent test post',
    created_at: new Date().toISOString()
  });
  
  // Call cleanup
  const response = await fetch('/api/admin/cleanup-content', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Verify old post deleted, recent kept
  const { data: remainingPosts } = await supabase
    .from('posts')
    .select('*');
  assert(!remainingPosts.find(p => p.content === 'Old test post'), 'Old post should be deleted');
  assert(remainingPosts.find(p => p.content === 'Recent test post'), 'Recent post should remain');
}
```

### 4. Test Refresh Profiles
```javascript
// Test Cases:
// 1. Should update all profile records
// 2. Should return count of updated profiles
// 3. Should not break existing data

async function testRefreshProfiles() {
  const response = await fetch('/api/admin/refresh-profiles', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  assert(response.ok, 'Should return 200');
  const data = await response.json();
  assert(data.profiles_updated === 13, 'Should update all 13 profiles');
}
```

### 5. Test Delete Today's Trios
```javascript
// Test Cases:
// 1. Should only delete trios created today
// 2. Should keep yesterday's trios
// 3. Should return count of deleted trios

async function testDeleteTodaysTrios() {
  // Create test trio from yesterday
  await supabase.from('trios').insert({
    member1_id: 'user1',
    member2_id: 'user2', 
    member3_id: 'user3',
    created_at: new Date(Date.now() - 24*60*60*1000).toISOString()
  });
  
  // Call delete
  const response = await fetch('/api/admin/delete-todays-trios', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Verify only today's deleted
  const { data: remainingTrios } = await supabase
    .from('trios')
    .select('*');
  assert(remainingTrios.find(t => 
    new Date(t.created_at) < new Date(Date.now() - 24*60*60*1000)
  ), 'Yesterday\'s trio should remain');
}
```

## Edge Cases to Test:

1. **Authorization**:
   - Non-admin users should get 403
   - Missing auth token should get 401

2. **Concurrent Operations**:
   - Multiple randomize calls at once
   - Cleanup while users are posting

3. **Error Handling**:
   - Database connection fails
   - Invalid data in database
   - Network timeouts

## Bug Report Template:

```markdown
### Bug: [Button Name] Not Working

**Steps to Reproduce:**
1. Click [button] in admin dashboard
2. Observe error/behavior

**Expected:** [What should happen]
**Actual:** [What actually happens]

**Error Message:** [Any console errors]
**Network Tab:** [Request/Response details]

**Priority:** Critical/High/Medium
```

## Performance Metrics to Track:

- Randomize Trios: Should complete in <2 seconds
- Cleanup Content: Should complete in <3 seconds  
- Refresh Profiles: Should complete in <2 seconds
- Delete Trios: Should complete in <1 second

## Your Working Directory:
`/Users/tyler/Library/CloudStorage/Dropbox/artrio-claude3`

## Deliverables:
1. `admin_controls_test.js` - Automated test suite
2. `TEST_REPORT.md` - Results of all tests
3. `BUG_REPORT.md` - Any issues found

Commit to branch `claude3` with message: "Test admin system controls"

## Coordinate with:
- **Claude 1**: Verify their backend endpoints are deployed
- **Claude 2**: Confirm their frontend changes are complete