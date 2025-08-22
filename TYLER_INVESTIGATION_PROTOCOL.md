# 🔬 The Tyler Investigation Protocol
## Ultra-Comprehensive Issue Investigation Framework

---

## PHASE 1: RECONNAISSANCE (Understand the Battlefield)

### 1.1 Define the EXACT Problem
```bash
# Questions to answer:
- WHAT is broken? (specific feature/function)
- WHERE does it break? (iOS/Web/Android, specific page/component)
- WHEN did it break? (after which commit/change)
- WHO is affected? (all users/specific users/just me)
- HOW does it manifest? (error message, blank screen, wrong data)
```

### 1.2 Reproduce the Issue
```bash
# Document EXACT steps:
1. Open app on [device/browser]
2. Navigate to [specific page]
3. Perform [specific action]
4. Observe [specific failure]

# Test matrix:
- [ ] iOS Device (Physical)
- [ ] iOS Simulator
- [ ] Safari (Desktop)
- [ ] Chrome (Desktop)
- [ ] Different user accounts
- [ ] Fresh install vs existing install
```

### 1.3 Gather ALL Context
```bash
# Check recent changes:
git log --oneline -20
git diff HEAD~5

# Check deployment status:
railway logs --tail 100
railway status

# Check error tracking:
- Browser console errors
- Xcode console output
- Network tab failures
- Supabase logs
```

---

## PHASE 2: FORENSICS (Collect Evidence)

### 2.1 Create Debug Infrastructure
```typescript
// Add strategic console.logs with prefixes:
console.log('[DEBUG-FRIENDS] Step 1: User ID:', user?.id);
console.log('[DEBUG-FRIENDS] Step 2: Session:', session);
console.log('[DEBUG-FRIENDS] Step 3: Profile query:', query);
console.log('[DEBUG-FRIENDS] Step 4: Response:', data);
console.log('[DEBUG-FRIENDS] Step 5: Error:', error);
```

### 2.2 Trace the Data Flow
```markdown
1. **Entry Point**: Where does the data originate?
   - User action (button click, navigation)
   - Component mount (useEffect)
   - External trigger (realtime subscription)

2. **Processing Chain**: Follow the data step-by-step
   - Component -> Hook -> Context -> API call
   - Document EVERY transformation

3. **Exit Point**: Where should the data end up?
   - State update
   - UI render
   - Database write

4. **Failure Point**: Where exactly does it break?
   - Mark the EXACT line where expected != actual
```

### 2.3 Check ALL Dependencies
```bash
# Authentication chain:
- Is user logged in? (check auth context)
- Is session valid? (check Supabase session)
- Are tokens fresh? (check expiry)
- Are cookies/localStorage intact?

# Database chain:
- Are RLS policies correct?
- Are foreign keys valid?
- Are indexes present?
- Is data actually in database?

# Network chain:
- Are requests being sent?
- Are responses returning?
- Are there CORS issues?
- Is there rate limiting?
```

---

## PHASE 3: HYPOTHESIS GENERATION (Think Like a Detective)

### 3.1 Common Patterns to Check
```markdown
## Race Conditions
- [ ] Component mounting before auth ready
- [ ] Multiple useEffects fighting
- [ ] Async operations out of order

## State Management Issues
- [ ] Stale closures in useEffect
- [ ] Missing dependencies in hooks
- [ ] State updates not batched

## Platform Differences
- [ ] iOS vs Web API availability
- [ ] Capacitor bridge issues
- [ ] Native vs browser storage

## Data Issues
- [ ] Null/undefined not handled
- [ ] Type mismatches
- [ ] Missing error boundaries
```

### 3.2 Generate Hypotheses
```markdown
Hypothesis 1: [Most likely cause]
- Evidence for: 
- Evidence against:
- Test: [How to verify]

Hypothesis 2: [Second likely cause]
- Evidence for:
- Evidence against:
- Test: [How to verify]

Hypothesis 3: [Edge case possibility]
- Evidence for:
- Evidence against:
- Test: [How to verify]
```

---

## PHASE 4: SYSTEMATIC TESTING (Prove or Disprove)

### 4.1 Isolation Testing
```typescript
// Create minimal reproduction:
// test-component.tsx
export function TestFriends() {
  // Strip everything except the failing part
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Just the failing query
    supabase.from('friends').select('*').then(console.log);
  }, []);
  
  return <div>{JSON.stringify(data)}</div>;
}
```

### 4.2 Binary Search Debugging
```bash
# Cut the problem in half repeatedly:
1. Does auth work? YES/NO
   - If NO -> Focus on auth
   - If YES -> Continue

2. Does Supabase connection work? YES/NO
   - If NO -> Check Supabase client
   - If YES -> Continue

3. Does the query work? YES/NO
   - If NO -> Check RLS/SQL
   - If YES -> Continue

4. Does the data display? YES/NO
   - If NO -> Check rendering
   - If YES -> Problem solved
```

### 4.3 Differential Diagnosis
```bash
# What DOES work?
- List all similar features that work
- Compare working vs broken implementation
- Diff the code between them

# When DID it work?
git bisect start
git bisect bad HEAD
git bisect good [last-known-working-commit]
# Test each commit until finding the breaking change
```

---

## PHASE 5: DEEP DIVE INVESTIGATION

### 5.1 Network Analysis
```bash
# Browser DevTools:
1. Network tab -> Filter by Fetch/XHR
2. Look for:
   - Failed requests (red)
   - Incorrect payloads
   - Missing headers
   - Wrong endpoints

# Supabase specific:
- Check anon key vs service key
- Check JWT token in Authorization header
- Check RLS policy requirements
```

### 5.2 Database Investigation
```sql
-- Run these in Supabase SQL editor:

-- Check if user exists:
SELECT * FROM auth.users WHERE id = '[user-id]';

-- Check profile:
SELECT * FROM profiles WHERE user_id = '[user-id]';

-- Check relationships:
SELECT * FROM friendships WHERE user_id = '[profile-id]' OR friend_id = '[profile-id]';

-- Check RLS policies:
SELECT * FROM pg_policies WHERE tablename = 'friendships';

-- Test query AS the user:
SET ROLE authenticated;
SET request.jwt.claim.sub = '[user-id]';
SELECT * FROM friendships; -- Does this work?
```

### 5.3 State Management Audit
```typescript
// Add debug middleware:
const debugState = (stateName: string) => {
  return (value: any) => {
    console.log(`[STATE-${stateName}]`, {
      timestamp: new Date().toISOString(),
      value,
      stack: new Error().stack
    });
    return value;
  };
};

// Use in component:
const [friends, setFriends] = useState([]);
const setFriendsDebug = (value) => setFriends(debugState('friends')(value));
```

---

## PHASE 6: SOLUTION VERIFICATION

### 6.1 Fix Implementation
```markdown
1. **Minimal Fix First**
   - Smallest change that solves the problem
   - Don't refactor while fixing

2. **Test the Fix**
   - On all affected platforms
   - With different user accounts
   - Under different conditions

3. **Verify No Regressions**
   - Test related features
   - Check performance impact
   - Ensure no new errors
```

### 6.2 Document the Solution
```markdown
## Issue Summary
- **Problem**: [Exact description]
- **Root Cause**: [Why it happened]
- **Solution**: [What fixed it]
- **Prevention**: [How to avoid in future]

## Technical Details
- **Affected Files**: [List files changed]
- **Affected Users**: [Who was impacted]
- **Time to Resolution**: [How long it took]

## Lessons Learned
- [What we learned]
- [What to do differently]
- [What to add to testing]
```

---

## PHASE 7: PREVENTION (Never Again)

### 7.1 Add Defensive Code
```typescript
// Add guards:
if (!user?.id) {
  console.error('[FRIENDS] No user ID, this should never happen');
  captureException(new Error('Missing user ID in Friends component'));
  return <ErrorState />;
}

// Add fallbacks:
const loadFriends = async () => {
  try {
    // main logic
  } catch (error) {
    console.error('[FRIENDS] Load failed:', error);
    // Try alternative method
    await loadFriendsAlternative();
  }
};
```

### 7.2 Add Monitoring
```typescript
// Add telemetry:
trackEvent('friends_load_started');
const result = await loadFriends();
trackEvent('friends_load_completed', { count: result.length });

// Add health checks:
useEffect(() => {
  const interval = setInterval(() => {
    if (friends.length === 0 && !loading) {
      console.warn('[HEALTH] Friends still empty after load');
    }
  }, 30000);
  return () => clearInterval(interval);
}, [friends, loading]);
```

---

## 🎯 THE TYLER QUESTIONS™

Before considering ANY issue "investigated", answer these:

1. **Can I reproduce it 100% of the time?**
2. **Do I know the EXACT line of code that fails?**
3. **Do I understand WHY it fails (not just how to fix)?**
4. **Have I tested the fix on ALL platforms?**
5. **Have I added logging to catch it next time?**
6. **Have I documented it for Future Tyler?**
7. **Could this bug happen elsewhere in similar code?**
8. **What's the root cause - not just the symptom?**
9. **How did this get past testing?**
10. **What would prevent this entire class of bugs?**

---

## 🚨 EMERGENCY PROTOCOL

When everything is on fire:

```bash
# 1. Rollback first, investigate later:
git revert HEAD
git push origin main

# 2. Check the basics:
- Is Supabase up? (status.supabase.com)
- Is Railway up? (status.railway.app)
- Did Apple/Google change something?
- Did a dependency update break things?

# 3. Binary search the problem:
git checkout HEAD~1  # Works?
git checkout HEAD~2  # Works?
git checkout HEAD~3  # Works?
# Keep going until you find the working commit

# 4. Diff the breaking change:
git diff [last-working] [first-broken]

# 5. Nuclear option - fresh start:
rm -rf node_modules ios/App/Pods
npm install
cd ios/App && pod install
npm run build
npx cap sync
```

---

## 📋 INVESTIGATION TEMPLATE

```markdown
# Investigation: [Issue Name]
Date: [DATE]
Investigator: Tyler & Claude

## Problem Statement
[One sentence description]

## Reproduction Steps
1. 
2. 
3. 

## Evidence Collected
- Console logs: [paste key findings]
- Network requests: [paste key findings]
- Database state: [paste key findings]

## Hypotheses Tested
1. ❌ [Hypothesis 1] - Disproved because...
2. ❌ [Hypothesis 2] - Disproved because...
3. ✅ [Hypothesis 3] - Confirmed because...

## Root Cause
[Detailed explanation]

## Solution
[Code changes made]

## Verification
- [ ] Fixed on iOS device
- [ ] Fixed on web
- [ ] No regressions
- [ ] Added logging
- [ ] Added tests

## Prevention
[What we're doing to prevent this]
```

---

Remember Tyler: **"Assumptions kill."** 
Test everything. Verify everything. Document everything.

When in doubt, zoom out. Look at the whole system, not just the error.