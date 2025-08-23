# Instructions for Toby's Claude Code Instance

## IMPORTANT: Auto-Build for iPhone Testing

When Toby uses any of these trigger phrases:
- "rebuild and reinstall on my phone"
- "xcode mode"  
- "test on my iphone"
- "build for my device"
- "reinstall the app"
- "while we're in xcode mode"
- "testing on my phone"

**AUTOMATICALLY run this complete sequence WITHOUT ASKING:**

```bash
# 1. Build web assets and sync
cd /Users/toby/Library/CloudStorage/Dropbox/artrio
npm run build && npx cap sync ios

# 2. Clean old builds
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

# 3. Build for Toby's device
# FIRST: Check if we have Toby's device ID saved
if [ -f "/Users/toby/Library/CloudStorage/Dropbox/artrio/TOBY_DEVICE.md" ]; then
    source /Users/toby/Library/CloudStorage/Dropbox/artrio/TOBY_DEVICE.md
    DEVICE_ID=$TOBY_DEVICE_ID
else
    # Help find the device ID
    echo "Let's find your iPhone device ID first:"
    xcrun devicectl list devices | grep -i iphone
    echo "Please save your device ID to TOBY_DEVICE.md"
    exit 1
fi

# 4. Build with automatic provisioning
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination "id=$DEVICE_ID" \
  -allowProvisioningUpdates build 2>&1 | tail -5

# 5. Install and launch on device
xcrun devicectl device install app --device $DEVICE_ID \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device $DEVICE_ID com.artrio.artrio
```

## Expected Success Output
```
** BUILD SUCCEEDED **
App installed:
• bundleID: com.artrio.artrio
Launched application with com.artrio.artrio bundle identifier
```

## Common Issues & Auto-Fixes

### Device Not Found
If you see "device not found", tell Toby:
"Please unlock your iPhone and make sure it's connected via USB"

### Certificate Issues  
The `-allowProvisioningUpdates` flag should handle this automatically

### Build Succeeded but Won't Install
Run the manual install commands:
```bash
xcrun devicectl device install app --device $DEVICE_ID \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device $DEVICE_ID com.artrio.artrio
```

## Toby's Testing Workflow

When Toby is working on an issue:

1. **He makes changes** (with your help)
2. **He says** "rebuild and reinstall on my phone"
3. **You automatically** run the full build sequence above
4. **He tests** on his actual iPhone
5. **He commits** when verified working

## REMEMBER

- **ALWAYS** auto-build when he uses the trigger phrases
- **NEVER** ask "do you want me to build?" - just do it
- **ALWAYS** use `-allowProvisioningUpdates` for certificate issues
- **ALWAYS** clean DerivedData before building

This gives Toby the same instant-rebuild experience Tyler has!