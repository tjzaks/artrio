# TestFlight Deployment Guide for Artrio

## Prerequisites Checklist

### 1. Apple Developer Account
- [ ] Apple Developer Program membership ($99/year)
- [ ] Sign in at: https://developer.apple.com
- [ ] Accept latest agreements

### 2. App Store Connect Access
- [ ] Sign in at: https://appstoreconnect.apple.com
- [ ] Verify access to create apps

## Step 1: Open Xcode Project

```bash
cd /Users/tyler/artrio
npx cap open ios
```

This opens the iOS project in Xcode.

## Step 2: Configure Xcode Project

### In Xcode, select "App" target and go to "Signing & Capabilities":

1. **Team**: Select your Apple Developer team
2. **Bundle Identifier**: `com.szakacsmedia.artrio`
3. **Signing Certificate**: Automatic manage signing ✓
4. **Provisioning Profile**: Automatic

### Update Build Settings:
1. Select "App" project
2. Build Settings → Search "version"
3. **Marketing Version**: 1.0.0
4. **Current Project Version**: 1

## Step 3: Add Required Permissions

The app needs camera and photo library access. In Xcode:

1. Select "App" → "Info"
2. Add these keys:

```
NSCameraUsageDescription: "Artrio needs camera access to capture photos for your posts"
NSPhotoLibraryUsageDescription: "Artrio needs photo library access to select images for your posts"
NSPhotoLibraryAddUsageDescription: "Artrio needs permission to save photos to your library"
```

## Step 4: Create App Icons

You need these icon sizes. Create a 1024x1024 master icon, then resize:

### Required Icon Sizes:
- 20pt: 40×40px (@2x), 60×60px (@3x)
- 29pt: 58×58px (@2x), 87×87px (@3x)  
- 40pt: 80×80px (@2x), 120×120px (@3x)
- 60pt: 120×120px (@2x), 180×180px (@3x)
- 1024×1024px (App Store)

### Quick Icon Generation:
1. Create a 1024x1024 icon
2. Use https://appicon.co to generate all sizes
3. In Xcode: App → Images.xcassets → AppIcon
4. Drag icons to appropriate slots

## Step 5: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+"
3. Fill in:
   - **Platform**: iOS
   - **Name**: Artrio
   - **Primary Language**: English
   - **Bundle ID**: Select or create `com.szakacsmedia.artrio`
   - **SKU**: artrio-2025

## Step 6: Build for TestFlight

### In Xcode:

1. **Select target**: "Any iOS Device (arm64)"
2. **Product → Clean Build Folder**
3. **Product → Archive**
4. Wait for build to complete

### Upload to App Store Connect:

1. **Window → Organizer**
2. Select your archive
3. Click "Distribute App"
4. Choose:
   - App Store Connect
   - Upload
   - Automatically manage signing
5. Click "Upload"

## Step 7: Configure TestFlight

### In App Store Connect:

1. Go to your app → TestFlight tab
2. Wait for build to process (10-30 minutes)
3. Complete Test Information:
   - **What to Test**: "Test all features of the social platform"
   - **App Description**: "Artrio is a social platform for sharing thoughts"
   - **Email**: your-email@example.com
   - **Beta App Review**: Fill required fields

### Add Testers:

1. **Internal Testing** (up to 100 testers):
   - Click (+) next to Internal Testing
   - Add tester emails
   - They get invite immediately

2. **External Testing** (up to 10,000):
   - Create test group
   - Add emails
   - Submit for Beta Review (24-48 hours)

## Step 8: Common Issues & Solutions

### Build Errors:

**"Signing for 'App' requires a development team"**
- Select your team in Signing & Capabilities

**"No profiles for 'com.szakacsmedia.artrio' were found"**
- Enable "Automatically manage signing"
- Sign in with Apple ID in Xcode preferences

**"Missing Info.plist key"**
- Add required permission descriptions

### Upload Errors:

**"Invalid Bundle ID"**
- Ensure Bundle ID matches App Store Connect

**"Missing required icon"**
- Add all icon sizes in Images.xcassets

## Step 9: Testing Your Beta

1. **Install TestFlight app** on your iPhone
2. **Accept invite** (check email)
3. **Install Artrio**
4. **Test all features**
5. **Submit feedback** through TestFlight

## Step 10: Iterate Based on Feedback

After testing:

1. Fix any bugs
2. Make improvements
3. Update version number
4. Archive and upload new build
5. TestFlight auto-updates testers

## Quick Commands Reference

```bash
# Build web assets
npm run build

# Sync with iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Update after code changes
npm run build && npx cap sync ios
```

## Timeline

- **Today**: Configure Xcode, create icons
- **Day 1**: Build and upload to TestFlight
- **Day 2**: Internal testing begins
- **Day 3-4**: Submit for external beta review
- **Day 5-6**: External testing begins
- **Week 2**: Iterate based on feedback
- **Week 3**: Final build for App Store

## Current Status

- [x] iOS project created with Capacitor
- [x] Bundle ID: com.szakacsmedia.artrio
- [ ] Icons created
- [ ] Xcode signing configured
- [ ] App Store Connect app created
- [ ] First build uploaded
- [ ] TestFlight configured
- [ ] Beta testing started

## Next Immediate Steps

1. Open Xcode: `npx cap open ios`
2. Configure signing with your Apple Developer account
3. Create app icon (1024x1024)
4. Build and archive
5. Upload to TestFlight

---

**Support**: 
- TestFlight issues: https://developer.apple.com/testflight/
- Capacitor docs: https://capacitorjs.com/docs/ios
- App Store Connect help: https://help.apple.com/app-store-connect/