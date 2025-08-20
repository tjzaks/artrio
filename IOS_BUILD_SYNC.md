# iOS Build Synchronization Protocol

## Current Status
- **Last Web Update**: Admin modal fixes (commit e7be135)
- **Build Claude**: Working on Xcode/TestFlight deployment
- **This Claude**: Making web fixes that need to be in iOS build

## Synchronization Steps

### Before iOS Build:
1. **Pull latest from main**
   ```bash
   git pull origin main
   ```

2. **Run Capacitor sync to update iOS with web changes**
   ```bash
   npm run build
   npx cap sync ios
   ```

3. **Verify changes are included**
   ```bash
   git log --oneline -5  # Check recent commits
   ```

### Key Commands for Build Claude:

```bash
# 1. Ensure latest web code
git pull origin main

# 2. Build the web app
npm run build

# 3. Sync to iOS (copies web build to iOS project)
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

## Recent Changes That Need iOS Sync:
- ✅ Admin Dashboard User Profile Modal fixes (e7be135)
- ✅ Read receipt debugging removed (87ef653)

## Communication Points:
- Always pull before building
- Always run `npx cap sync ios` after web changes
- The web build (`npm run build`) must complete before sync

## Files Modified Today:
- `/src/components/admin/UserProfileModal.tsx` - Fixed layout for iOS
- `/src/pages/Messages.tsx` - Removed debug panel