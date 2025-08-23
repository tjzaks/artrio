# Toby's Xcode Setup & Auto-Install Guide

## Initial Setup (One Time Only)

### 1. Connect Your iPhone to Mac
- Plug in your iPhone via USB cable
- Trust the computer when prompted on phone
- Keep phone unlocked during setup

### 2. Get Your Device ID
Tell Claude Code:
```
Help me find my iPhone device ID for Xcode development
```

Claude will run:
```bash
xcrun devicectl list devices | grep -i iphone
```

You'll see something like:
```
Toby's iPhone    00008140-001234567890ABCD    iPhone15,2    17.x    available (paired)
```

Copy that device ID (the long number)!

### 3. Update Claude's Memory
Create a file called `TOBY_DEVICE.md` in the artrio folder:
```bash
echo "TOBY_DEVICE_ID=00008140-001234567890ABCD" > /Users/toby/Library/CloudStorage/Dropbox/artrio/TOBY_DEVICE.md
```

## Daily Workflow - Testing on Your iPhone

### The Magic Words for Claude Code

When you need to test on your iPhone, just say:
```
"rebuild and reinstall on my phone"
```

Or any of these:
- "xcode mode"
- "test on my iphone"
- "build for my device"
- "reinstall the app"

### What Claude Will Do Automatically

Claude will run this exact sequence:
```bash
# 1. Build the web code
npm run build && npx cap sync ios

# 2. Clean old builds
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

# 3. Build for YOUR device (using your ID)
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=YOUR_DEVICE_ID' \
  -allowProvisioningUpdates build 2>&1 | tail -5

# 4. Install and launch
xcrun devicectl device install app --device YOUR_DEVICE_ID \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device YOUR_DEVICE_ID com.artrio.artrio
```

## Toby's Complete Task Workflow

### 1. Get your assigned issue
```bash
gh issue list --assignee @me --label "toby-task"
```

### 2. Start the task
Tell Claude:
```
I need to complete GitHub issue #5. Here's the issue:
[paste issue content]
```

### 3. Claude makes the changes

### 4. Test on your iPhone
Say:
```
Now rebuild and reinstall on my phone so I can test
```

### 5. Test the specific fix
- Open the app on your phone
- Navigate to the feature
- Verify the fix works

### 6. Complete the issue
```bash
git add -A
git commit -m "Fix: [issue title] (#5)"
git push origin main
gh issue close 5 --comment "Tested on iPhone - works perfectly!"
```

## Troubleshooting

### If build fails with "device not found"
Your phone might be locked or disconnected:
1. Unlock your iPhone
2. Reconnect USB cable
3. Try again

### If build succeeds but won't install
Tell Claude:
```
The build succeeded but it won't install on my phone
```

Claude will run the manual install commands.

### If you see certificate errors
Tell Claude:
```
I'm getting signing certificate errors
```

Claude will add `-allowProvisioningUpdates` to fix it.

## Claude Code Instructions for Toby's Claude

Add this to your Claude's project knowledge:

```markdown
## Toby's iPhone Development Setup

When Toby says any of these phrases:
- "rebuild and reinstall on my phone"
- "xcode mode"
- "test on my iphone"
- "build for my device"

Automatically run this sequence:

1. First, check if Toby's device ID is saved:
```bash
cat /Users/toby/Library/CloudStorage/Dropbox/artrio/TOBY_DEVICE.md
```

2. If not found, help him find it:
```bash
xcrun devicectl list devices | grep -i iphone
```

3. Then run the full build and install:
```bash
# Build web assets
npm run build && npx cap sync ios

# Clean and build for iOS
cd /Users/toby/Library/CloudStorage/Dropbox/artrio/ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=TOBY_DEVICE_ID' \
  -allowProvisioningUpdates build 2>&1 | tail -5

# Install and launch
xcrun devicectl device install app --device TOBY_DEVICE_ID \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device TOBY_DEVICE_ID com.artrio.artrio
```

Success looks like:
- "BUILD SUCCEEDED"
- "App installed:"
- "Launched application"

If any step fails, follow the troubleshooting in TOBY_XCODE_SETUP.md
```

## The Power Move

Once this is set up, your workflow is just:
1. Make changes with Claude
2. Say "rebuild and reinstall on my phone"
3. Test on your actual iPhone
4. Commit when it works

No manual Xcode clicking needed! 🎉