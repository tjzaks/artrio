# Toby Build Failure - Quick Fixes

## Toby: Tell Claude This When Build Fails

---

Claude, the build failed. Here's how to fix it:

## Quick Fix Sequence (Try These In Order)

### 1. First - Pull Tyler's Latest
Tyler might have already fixed it:
```bash
cd ~/artrio
git fetch origin
git pull origin main
npm install  # In case dependencies changed
```

### 2. Clean Everything and Retry
```bash
cd ~/artrio/ios/App
# Nuclear clean
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf Pods
rm -f Podfile.lock

# Reinstall pods
pod install

# Try build again
cd ~/artrio
npm run build && npx cap sync ios
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[YOUR_DEVICE_ID]' \
  -allowProvisioningUpdates clean build 2>&1 | tail -20
```

### 3. Check Common Issues

#### Certificate/Signing Issues
If you see "signing certificate" or "provisioning" errors:
```bash
# Build with forced provisioning update
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[YOUR_DEVICE_ID]' \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  build 2>&1 | tail -30
```

#### Device Not Found
If you see "device not found":
- Tell Toby: "Unlock your iPhone and reconnect the USB cable"
- Then run:
```bash
xcrun devicectl list devices | grep -i iphone
```

#### Build Succeeds But Won't Install
If build says "SUCCEEDED" but app won't install:
```bash
# Manual install
xcrun devicectl device install app --device [YOUR_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app

# If that fails, try with verbose output
xcrun devicectl device install app --device [YOUR_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app \
  --verbose
```

### 4. Check What's Wrong
Show Toby the actual error:
```bash
# Get last 50 lines of build output
cd ~/artrio/ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[YOUR_DEVICE_ID]' \
  build 2>&1 | tail -50
```

Look for:
- Red error lines
- "Failed" messages
- Missing file errors
- Pod-related issues

### 5. Common Errors and Fixes

#### "No such module" Error
```bash
cd ~/artrio
npm install
npx cap sync ios
cd ios/App
pod install
```

#### "Duplicate symbols" Error
```bash
cd ~/artrio/ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf build
```

#### "Could not find module" for Capacitor
```bash
cd ~/artrio
npm run build
npx cap sync ios
```

#### TypeScript/Build Errors
```bash
cd ~/artrio
npm run lint  # See what's wrong
npm run build  # This might show the real error
```

## Emergency Recovery

If nothing works:
```bash
# 1. Save your current work
cd ~/artrio
git stash

# 2. Get fresh copy of Tyler's code
git checkout dev
git fetch origin
git reset --hard origin/main

# 3. Clean rebuild
npm install
npm run build
npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod deintegrate
pod install

# 4. Try build one more time
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[YOUR_DEVICE_ID]' \
  -allowProvisioningUpdates clean build

# 5. Restore your work
git stash pop
```

## Tell Tyler

If still failing after all attempts:
```bash
# Show Tyler the error
cd ~/artrio
git status  # Show what you changed
git diff    # Show the actual changes

# Create a detailed error report
echo "Build failed with this error:" > build_error.txt
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[YOUR_DEVICE_ID]' \
  build 2>&1 | tail -100 >> build_error.txt

# Tell Tyler: "Build is failing, I've tried all troubleshooting steps. Error saved in build_error.txt"
```

## Success Indicators

You know it's working when you see:
```
** BUILD SUCCEEDED **

App installed:
• bundleID: com.artrio.artrio

Launched application with com.artrio.artrio bundle identifier
```

## Prevention

To avoid build failures:
1. Always pull Tyler's latest before starting work
2. Run `npm install` if package.json changed
3. Run `pod install` if iOS dependencies changed
4. Clean DerivedData regularly
5. Keep iPhone unlocked during builds