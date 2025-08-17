# TestFlight Team Assignments - Parallel Development

## Current Status
iOS project created at: `/Users/tyler/artrio/ios`
Ready for parallel work on TestFlight preparation!

---

## Claude 2 (Frontend) - UI/UX Polish for iOS

### Your TestFlight Tasks:
1. **Optimize for iOS Safari WebView**
   - Fix any CSS issues for iOS
   - Ensure touch targets are 44x44 points minimum
   - Test swipe gestures work properly
   - Remove any hover states (iOS doesn't have hover)

2. **Polish Mobile UI**
   ```bash
   cd /Users/tyler/artrio-worktrees/frontend
   npm run dev
   # Test at iPhone sizes: 375px, 390px, 414px, 428px wide
   ```

3. **Performance Optimization**
   - Reduce bundle size (currently 594KB)
   - Implement code splitting
   - Optimize images for mobile
   - Add loading states for slow connections

4. **iOS-Specific Features**
   - Pull-to-refresh implementation
   - Safe area insets for notched iPhones
   - Keyboard handling improvements
   - Status bar color matching

### Deliverables:
- [ ] All screens work at iPhone SE size (375px)
- [ ] Bundle size under 400KB
- [ ] 60fps scrolling performance
- [ ] Loading states for all async operations

---

## Claude 3 (Backend) - API & Supabase Optimization

### Your TestFlight Tasks:
1. **Production Configuration**
   - Verify all Supabase RLS policies
   - Set up rate limiting
   - Configure proper CORS for app://* URLs
   - Test offline support

2. **Authentication Polish**
   ```sql
   -- Ensure these work for mobile:
   - Email/password login
   - Password reset flow
   - Session persistence
   - Biometric auth preparation
   ```

3. **API Performance**
   - Optimize database queries
   - Add proper indexes
   - Implement caching where needed
   - Reduce payload sizes

4. **Data Security**
   - Audit all endpoints
   - Verify no sensitive data in logs
   - Test error messages are user-friendly
   - Implement request validation

### Deliverables:
- [ ] All APIs respond in <200ms
- [ ] Authentication works on mobile
- [ ] Offline mode handles gracefully
- [ ] Zero security vulnerabilities

---

## Claude 4 (Mobile) - iOS Build & TestFlight

### Your TestFlight Tasks:
1. **Xcode Configuration**
   ```bash
   cd /Users/tyler/artrio-worktrees/mobile
   npx cap open ios
   ```
   - Configure signing certificates
   - Set up provisioning profiles
   - Update Info.plist with permissions
   - Configure build settings

2. **Create App Assets**
   - Generate all icon sizes (use https://appicon.co)
   - Create launch screen
   - Take screenshots for TestFlight
   - Design app preview video (optional)

3. **Native Features**
   - Configure push notifications
   - Set up camera permissions
   - Test photo library access
   - Implement haptic feedback

4. **TestFlight Submission**
   - Build and archive in Xcode
   - Upload to App Store Connect
   - Complete TestFlight information
   - Set up test groups

### Deliverables:
- [ ] Icons in all required sizes
- [ ] Launch screen configured
- [ ] Build uploads successfully
- [ ] TestFlight beta live

---

## Orchestrator (You) - Coordination & Integration

### Your Tasks:
1. **Merge all branches when ready**
   ```bash
   cd /Users/tyler/artrio
   git merge dev-frontend dev-backend dev-mobile
   npm run build
   npx cap sync ios
   ```

2. **App Store Connect Setup**
   - Create app listing
   - Configure TestFlight
   - Manage certificates
   - Invite beta testers

3. **Quality Assurance**
   - Test merged build
   - Verify all features work
   - Check performance metrics
   - Approve for TestFlight

4. **Timeline Management**
   - Track progress from all Claudes
   - Resolve blockers
   - Coordinate testing
   - Plan App Store submission

---

## Parallel Workflow

### Right Now - All Claudes Work Simultaneously:

**Frontend Claude:**
```bash
cd /Users/tyler/artrio-worktrees/frontend
# Start optimizing for iOS immediately
```

**Backend Claude:**
```bash
cd /Users/tyler/artrio-worktrees/backend
# Verify production readiness
```

**Mobile Claude:**
```bash
cd /Users/tyler/artrio-worktrees/mobile
npx cap open ios
# Start Xcode configuration
```

### Sync Points (Every 2 hours):
1. Each Claude commits their work
2. You merge into main
3. Run `npm run build && npx cap sync ios`
4. Test integrated build

---

## Communication Protocol

Each Claude reports:
```
[ROLE -> ORCHESTRATOR]
TestFlight Task: [What they're working on]
Progress: [X/Y tasks complete]
Blockers: [Any iOS-specific issues]
Ready to merge: YES/NO
```

---

## Success Metrics

- **4 hours**: All UI optimized, icons created, Xcode configured
- **8 hours**: First build uploaded to TestFlight
- **24 hours**: Internal beta testing live
- **48 hours**: External beta approved
- **1 week**: 50+ beta testers using app

---

## Quick Start for Each Claude

### Tell Claude 2:
"Focus on iOS UI optimization for TestFlight. Read TESTFLIGHT_TEAM_ASSIGNMENTS.md in Dropbox for your specific tasks. Work in /Users/tyler/artrio-worktrees/frontend"

### Tell Claude 3:
"Prepare the backend for TestFlight production. Read TESTFLIGHT_TEAM_ASSIGNMENTS.md in Dropbox for your specific tasks. Work in /Users/tyler/artrio-worktrees/backend"

### Tell Claude 4:
"Handle iOS build and TestFlight submission. Read TESTFLIGHT_TEAM_ASSIGNMENTS.md in Dropbox for your specific tasks. Work in /Users/tyler/artrio-worktrees/mobile"

---

**Let's get Artrio on TestFlight TODAY!**