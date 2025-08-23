# Xcode Build & Launch Issues - Quick Fixes

## When app doesn't auto-launch after build:

### Quick Fix (90% success rate):
1. Let build complete (even if app doesn't open)
2. **Manually tap the Artrio app on your phone**
3. In Xcode: Debug → Attach to Process → App

### If that doesn't work:
1. Stop the build (⌘.)
2. Delete app from phone
3. In Xcode: Product → Clean Build Folder (⇧⌘K)
4. Build again (⌘R)

## To ensure changes are captured:

### Use the build helper script:
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
./scripts/xcode-build.sh
```

### Or manually verify:
1. Check the console logs for "WebView loaded"
2. Look for your user ID in logs
3. If you see "Found conversations", the app is running

## Why this happens:

- **iOS 17+ issue**: Apple changed how apps launch from Xcode
- **iPhone Mirroring conflict**: Sometimes interferes with direct builds
- **Xcode cache**: Old build artifacts cause launch failures

## Most reliable method:

### Use TestFlight for updates:
1. Product → Archive
2. Distribute → App Store Connect
3. Update through TestFlight app
- **Pro**: Always works, no launch issues
- **Con**: Takes 5-10 minutes to process

## Build verification:

Your logs show SUCCESS when you see:
- `⚡️ WebView loaded`
- `⚡️ [log] - 🔑 SIMULATOR DEBUG: Auth state changed - session: true`
- `Found conversations: 3`

These mean the app is running with latest code!

## Pro tip:

The "UIKit requires update" warning is harmless - it's a Capacitor/iOS compatibility notice that doesn't affect functionality.