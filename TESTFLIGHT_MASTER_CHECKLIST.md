# TestFlight Master Checklist - Artrio App

## Phase 1: Prerequisites
### Apple Developer Account
- [ ] Apple Developer Program membership active ($99/year)
- [ ] Accepted latest agreements in App Store Connect
- [ ] Two-factor authentication enabled
- [ ] Payment information up to date

### Development Environment
- [ ] Xcode installed (latest stable version)
- [ ] macOS updated to support latest Xcode
- [ ] Node.js and npm installed
- [ ] Capacitor CLI installed globally

## Phase 2: App Configuration
### Bundle & Identity
- [ ] Bundle ID: `com.tobyszaks.artrio`
- [ ] App Name: Artrio
- [ ] Version: 1.0.0
- [ ] Build Number: 1
- [ ] Team ID configured in Xcode
- [ ] Automatic signing enabled

### Certificates & Profiles
- [ ] iOS Development certificate created
- [ ] iOS Distribution certificate created
- [ ] App ID registered in Developer Portal
- [ ] Provisioning profile for development
- [ ] Provisioning profile for distribution
- [ ] Push notification certificate (if using)

## Phase 3: App Assets
### Icons (Required Sizes)
- [ ] 20pt: 40×40px (@2x), 60×60px (@3x)
- [ ] 29pt: 58×58px (@2x), 87×87px (@3x)
- [ ] 40pt: 80×80px (@2x), 120×120px (@3x)
- [ ] 60pt: 120×120px (@2x), 180×180px (@3x)
- [ ] 1024×1024px (App Store, no alpha)

### Launch Screen
- [ ] Launch screen storyboard configured
- [ ] Supports all device sizes
- [ ] No loading indicators
- [ ] Matches first screen of app

### Screenshots (for TestFlight)
- [ ] 6.7" (iPhone 15 Pro Max): 1290×2796px
- [ ] 6.5" (iPhone 14 Plus): 1284×2778px
- [ ] 5.5" (iPhone 8 Plus): 1242×2208px
- [ ] 12.9" (iPad Pro): 2048×2732px (if supporting iPad)

## Phase 4: App Store Connect Setup
### App Creation
- [ ] Sign in to App Store Connect
- [ ] Create new app
- [ ] Select bundle ID
- [ ] Enter app name
- [ ] Select primary language
- [ ] Choose categories
- [ ] Set content rating

### TestFlight Information
- [ ] Beta App Description (max 4000 characters)
- [ ] Feedback email
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL (required)
- [ ] License Agreement (optional)
- [ ] Beta App Review Information
  - [ ] Contact information
  - [ ] Demo account (if needed)
  - [ ] Notes for review

### Test Groups
- [ ] Internal testing group created
- [ ] Add internal testers (up to 100)
- [ ] External testing group created
- [ ] External tester emails collected
- [ ] Group names defined

## Phase 5: Build Preparation
### Code Requirements
- [ ] No compiler errors
- [ ] No critical warnings
- [ ] Console.log statements removed
- [ ] API endpoints pointing to production
- [ ] Error tracking configured
- [ ] Analytics configured (optional)

### Permissions (Info.plist)
- [ ] Camera usage description
- [ ] Photo library usage description
- [ ] Location usage description (if needed)
- [ ] Push notification entitlement
- [ ] Associated domains (if using deep links)
- [ ] Background modes (if needed)

### Performance Checks
- [ ] App size under 100MB (ideal)
- [ ] Memory leaks checked
- [ ] Battery usage optimized
- [ ] Network calls optimized
- [ ] Animations run at 60fps

## Phase 6: Build & Upload
### Build Process
```bash
# 1. Install dependencies
cd /Users/tyler/artrio-worktrees/mobile
npm install

# 2. Build production version
npm run build

# 3. Sync with iOS
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

### Xcode Archive
- [ ] Select "Any iOS Device" as target
- [ ] Product → Clean Build Folder
- [ ] Product → Archive
- [ ] Archive validates successfully
- [ ] No validation warnings

### Upload to App Store Connect
- [ ] Open Organizer (Window → Organizer)
- [ ] Select archive
- [ ] Click "Distribute App"
- [ ] Choose "App Store Connect"
- [ ] Upload successful
- [ ] Processing email received

## Phase 7: TestFlight Configuration
### Build Management
- [ ] Build appears in App Store Connect
- [ ] Build processing complete (10-30 min)
- [ ] Export compliance completed
- [ ] Beta entitlement added

### Testing Setup
- [ ] Build added to test groups
- [ ] Test information completed
- [ ] Auto-notify testers enabled
- [ ] Tester invitations sent

## Phase 8: Testing & Feedback
### Internal Testing
- [ ] Install TestFlight app on test devices
- [ ] Accept invitation
- [ ] Install and test app
- [ ] Verify all features work
- [ ] Check for crashes
- [ ] Submit feedback

### External Testing
- [ ] Submit for Beta App Review
- [ ] Review approved (24-48 hours)
- [ ] External testers notified
- [ ] Collect feedback
- [ ] Track crash reports

## Phase 9: Iteration
### Feedback Response
- [ ] Prioritize critical bugs
- [ ] Fix user-reported issues
- [ ] Improve based on feedback
- [ ] Performance optimization

### New Build Process
- [ ] Increment build number
- [ ] Repeat Phase 6-8
- [ ] Notify testers of updates
- [ ] Track improvements

## Phase 10: Pre-Launch
### Final Checks
- [ ] All critical bugs fixed
- [ ] Performance acceptable
- [ ] UI/UX polished
- [ ] TestFlight feedback positive
- [ ] Crash-free rate > 99%

### App Store Submission Prep
- [ ] Final screenshots
- [ ] App description
- [ ] Keywords
- [ ] Support URL
- [ ] Marketing materials
- [ ] Release notes

## Common Issues & Solutions

### Build Failures
- Clean derived data: `~/Library/Developer/Xcode/DerivedData`
- Reset provisioning profiles
- Check certificate expiration
- Verify bundle ID matches

### Upload Errors
- Check App Store Connect status
- Verify account permissions
- Ensure unique build number
- Check network connection

### TestFlight Not Available
- Wait for processing (up to 48 hours)
- Check export compliance
- Verify beta entitlements
- Contact App Store Connect support

## Timeline Estimate
- **Day 1-2**: Prerequisites & Setup
- **Day 3-4**: Asset Creation & Configuration
- **Day 5-6**: Build & Initial Upload
- **Day 7-8**: Internal Testing
- **Day 9-10**: Beta Review & External Testing
- **Day 11-14**: Iteration based on feedback
- **Day 15**: Final build for App Store

## Support Resources
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)

## Contact for Issues
- Technical Issues: Contact Orchestrator (Claude 1)
- Account Issues: Tyler (Apple ID account owner)
- Urgent Blocks: Escalate immediately

---
**Last Updated**: [Current Date]
**Target Launch**: [Set target date]
**Current Status**: Phase 1 - Prerequisites