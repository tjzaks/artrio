# 🔬 Surgical Refactoring Brief for Claude

## Critical Context
You're refactoring Artrio, a working iOS/web app with real users on TestFlight. The app works but has severe technical debt. Your mission: Clean without breaking.

## Current Working Features (DO NOT BREAK)
1. **Trio Formation**: Users matched in groups of 3
2. **Messaging**: Real-time chat with read receipts
3. **Stories**: Photo sharing with gallery selection
4. **Friends System**: Add/accept/reject requests  
5. **Online Presence**: Shows "Active now" status
6. **Railway Deployment**: Auto-deploys from main branch

## Architecture Overview
```
Frontend: React + TypeScript + Tailwind + Capacitor
Backend: Supabase (Auth, Database, Storage, Realtime)
Deploy: Railway (web) + TestFlight (iOS)
Key Files:
- Messages.tsx: Core messaging (1200 lines - needs splitting)
- usePresence.ts: Online status hook (just fixed, don't break)
- AuthContext.tsx: Authentication state
```

## Known Issues & Solutions

### 1. DUPLICATE COMPONENTS (Delete 4, Keep 1)
```typescript
// KEEP THIS ONE:
src/components/SnapchatStoryCreator.tsx

// DELETE THESE (they do the same thing):
src/components/SimpleStoryCreator.tsx
src/components/NativeStoryCreator.tsx  
src/components/InstagramStoryCreator.tsx
src/components/StoryCamera.tsx

// Update imports in:
src/pages/Home.tsx - Line ~420 where story creator is rendered
```

### 2. DUPLICATE GALLERIES (Delete 3, Keep 1)
```typescript
// KEEP THIS ONE:
src/components/NativePhotoGallery.tsx

// DELETE THESE:
src/components/CameraRollGallery.tsx
src/components/IOSPhotoGallery.tsx
src/components/NativeGallery.tsx

// Update imports in:
src/components/SnapchatStoryCreator.tsx
src/pages/Messages.tsx
```

### 3. CONSOLE.LOG REMOVAL (156 instances)
```bash
# DO NOT use sed/regex - it might break JSX
# Instead, manually check each file:

src/contexts/AuthContext.tsx - Remove lines with "SIMULATOR DEBUG"
src/App.tsx - Remove lines with "SIMULATOR DEBUG"  
src/hooks/usePresence.ts - KEEP presence logs for now (we just fixed this)
src/pages/Friends.tsx - KEEP debug logs (actively debugging)

# Safe to remove ALL console.logs in:
src/pages/DebugMessages.tsx
src/pages/Debug.tsx
```

### 4. DEAD FILES TO DELETE
```bash
# These are 100% safe to delete:
rm src/pages/Messages.old.tsx  # Old backup
rm src/components/HealthCheck.tsx  # No imports
rm src/components/ProfileSkeleton.tsx  # Unused
rm src/components/IOSLoader.tsx  # Using standard loaders

# Check git history if needed later
```

### 5. SQL FILE ORGANIZATION
```bash
# Create structure:
mkdir -p sql/migrations/applied
mkdir -p sql/migrations/pending  
mkdir -p sql/debug/archive

# Move files (CHECK EACH BEFORE MOVING):
# These are ALREADY APPLIED (check Supabase migrations table):
mv 20240*.sql sql/migrations/applied/

# These are DEBUG scripts (not migrations):
mv DEBUG_*.sql sql/debug/archive/
mv CHECK_*.sql sql/debug/archive/
mv DIAGNOSTIC_*.sql sql/debug/archive/

# These MIGHT be pending (CHECK FIRST):
CHECK_PRESENCE_STATUS.sql - Created today, pending
FIX_PRESENCE_REALTIME.sql - Created today, pending
```

## CRITICAL: Message.tsx Refactor Strategy

### Current Structure (1200 lines)
```typescript
// Messages.tsx currently contains:
- Message list UI
- Conversation list UI  
- Message sending logic
- Photo upload logic
- Read receipt logic
- Typing indicators
- Search functionality
- Scroll management
```

### Proposed Split (WITHOUT BREAKING)
```typescript
// 1. Keep Messages.tsx as container (200 lines)
// 2. Extract components:

components/messages/ConversationList.tsx (150 lines)
- Move lines 1000-1150 (conversation list rendering)

components/messages/MessageThread.tsx (300 lines)  
- Move lines 400-700 (message display)

components/messages/MessageInput.tsx (150 lines)
- Move lines 700-850 (input bar + send)

components/messages/MessagePhoto.tsx (100 lines)
- Move photo upload logic

hooks/useMessages.ts (200 lines)
- Move all message fetching/sending logic

// 3. Update imports carefully
// 4. Test each extraction before moving to next
```

## Testing Protocol (After EACH Change)

### Local Test
```bash
npm run dev
# Test: Can still send messages?
# Test: Can still see online status?
# Test: Can still upload photos?
```

### iOS Test  
```bash
npm run build && npx cap sync ios
# Open Xcode, build to Tyler's iPhone
# Test all features still work
```

### Deploy Test
```bash
git add -A && git commit -m "Refactor: [specific change]"
git push origin main
# Wait 3 mins for Railway deploy
# Check https://artrio.up.railway.app
```

## Order of Operations (SAFE SEQUENCE)

### Phase 1: Delete Dead Code (Low Risk)
```bash
# 1. Delete backup files
rm src/pages/Messages.old.tsx

# 2. Delete unused components  
rm src/components/HealthCheck.tsx
rm src/components/ProfileSkeleton.tsx

# 3. Commit and test
git add -A && git commit -m "Remove dead code"
git push origin main
```

### Phase 2: Consolidate Duplicates (Medium Risk)
```bash
# 1. Update imports to use SnapchatStoryCreator everywhere
# 2. Test that stories still work
# 3. Delete other story creators
# 4. Commit and test
```

### Phase 3: Remove Console Logs (Low Risk)
```bash
# 1. Remove ONLY "SIMULATOR DEBUG" logs
# 2. Keep presence and friend logs for now
# 3. Test features still work
# 4. Commit
```

### Phase 4: Split Messages.tsx (High Risk)
```bash
# 1. Extract ONE component at a time
# 2. Test after EACH extraction
# 3. Start with safest: MessagePhoto component
# 4. End with riskiest: Message thread logic
```

## What NOT to Touch

### DO NOT CHANGE (Recently Fixed):
- `usePresence.ts` - Just fixed today
- `Friends.tsx` - Actively being debugged
- Railway config files
- Supabase migrations
- iOS build settings

### DO NOT DELETE (Might Look Dead But Aren't):
- `src/pages/Health.tsx` - Might be used for monitoring
- `src/pages/Admin.tsx` - Hidden admin panel
- Any file with "admin" in name
- Any `.sql` file until verified in Supabase

## Success Criteria
- [ ] All current features still work
- [ ] Bundle size reduced by 20%+
- [ ] No console.logs in production
- [ ] Messages.tsx under 400 lines
- [ ] No duplicate components
- [ ] SQL files organized
- [ ] Can still deploy to Railway
- [ ] Can still build for iOS

## If Something Breaks

### Rollback Process
```bash
# 1. Check last working commit
git log --oneline -5

# 2. Revert to last working
git revert HEAD
git push origin main

# 3. Railway auto-deploys previous version
```

### Common Break Points
- **Imports**: Triple-check all import paths
- **Supabase Types**: Don't change type definitions
- **useEffect Dependencies**: Don't remove deps
- **SQL Migrations**: Never delete applied migrations

## Final Checklist Before Each Commit

- [ ] `npm run dev` - No errors?
- [ ] Send a test message - Works?
- [ ] Check online status - Shows?
- [ ] Upload a photo - Works?
- [ ] Create a story - Works?
- [ ] Small commit (one feature)?
- [ ] Clear commit message?

## Example First Commit (SAFE)
```bash
# Start with the safest change:
rm src/pages/Messages.old.tsx
git add -A
git commit -m "Remove Messages.old.tsx backup file"
git push origin main

# If this works, proceed with confidence
```

Remember: Working code > Clean code. Make it work, make it right, then make it fast.