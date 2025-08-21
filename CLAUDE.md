## Artrio Development Context Protocol

**IMPORTANT: When working on Artrio, ALWAYS ASK:**
"What's our focus - mobile app (Xcode/iOS), web (Safari mobile), or desktop (browser)?"

This context is CRITICAL because:
- **Mobile App (Xcode)**: Capacitor bridge issues, native iOS APIs, Swift/Objective-C interop, simulator vs device
- **Safari Mobile (Web)**: Mobile Safari quirks, viewport issues, touch events, iOS browser limitations
- **Desktop Browser**: Full dev tools, different viewport, mouse events, broader API support

Each platform has completely different debugging approaches, error patterns, and solutions!

## Artrio Deployment Protocol

**CRITICAL: After ANY code changes to the Artrio project:**
1. **ALWAYS commit and push to main branch immediately**
2. **Railway automatically rebuilds and deploys from main**
3. **Changes go live within 2-3 minutes**

```bash
# Standard workflow for Artrio changes:
git add -A
git commit -m "Clear description of changes"
git push origin main
# Railway auto-deploys within 2-3 minutes
```

## Xcode Build & Installation Troubleshooting Protocol

### 🚨 TRIGGER PHRASES FROM TYLER:
- "Xcode won't reinstall"
- "Build succeeded but app won't install"
- "still didn't reinstall the app"
- "it won't reinstall the app on my phone"
- "successful build, again, it didn't install"
- "ugh...investigate pls"

**WHEN YOU HEAR ANY OF THESE → IMMEDIATELY DO THIS:**

```bash
# QUICK FIX (90% success rate) - Tyler just runs these 3 commands:
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device 00008140-001A39900162801C com.artrio.artrio
```

**Tyler should see "App installed:" and "Launched application" - DONE!**

### If Tyler needs more detail or quick fix didn't work:

### DIAGNOSIS STEPS:

1. **Understand the symptoms Tyler is reporting:**
   - "Build succeeded" in Xcode but app doesn't appear on phone
   - "Won't reinstall the app" despite successful build
   - App installation seems stuck or nothing happens after build

2. **Check device connection status:**
```bash
xcrun devicectl list devices | grep -i iphone
# Expected output: Tyler's iPhone 16             00008140-001A39900162801C...available (paired)
# If no output or different device, have Tyler reconnect his iPhone
```

3. **Look for error patterns in build output:**
```bash
# Check last 20 lines of build for clues
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' build 2>&1 | tail -20

# Common errors to look for:
# - "Signing certificate is invalid" → Certificate expired
# - "duplicate interface definition" → Just warnings, not the real issue
# - "** BUILD SUCCEEDED **" but no install → Xcode not set to auto-run
```

### SOLUTION WORKFLOW:

#### Step 1: Clean everything (ALWAYS start here)
```bash
# Remove ALL DerivedData (this is where Xcode caches builds)
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

# Why: Xcode often gets confused with cached build artifacts
# This forces a completely fresh build
```

#### Step 2: Fix CocoaPods dependencies
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App
pod deintegrate  # Removes all traces of pods from project
pod install      # Reinstalls fresh

# Why: Pod dependencies can get out of sync, especially after multiple builds
```

#### Step 3: Handle certificate issues (VERY COMMON)
```bash
# Build with automatic provisioning updates
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates build 2>&1 | tail -20

# Why: Tyler's certificates expire periodically
# The -allowProvisioningUpdates flag auto-renews them
# Watch for "Signing Identity: Apple Development: Tyler Szakacs" in output
```

#### Step 4: Manual installation (MOST RELIABLE)
```bash
# Don't rely on Xcode's auto-install - do it manually
xcrun devicectl device install app \
  --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app

# Expected output:
# "App installed:"
# "bundleID: com.artrio.artrio"
# If you see this, installation succeeded!

# Then launch the app
xcrun devicectl device process launch \
  --device 00008140-001A39900162801C \
  com.artrio.artrio

# Expected: "Launched application with com.artrio.artrio bundle identifier"
```

### UNDERSTANDING THE ROOT CAUSE:
- **Why this happens**: Xcode's "Build Succeeded" only means compilation worked, NOT that it installed
- **The real issue**: Xcode's auto-install to device is unreliable, especially after multiple builds
- **The solution**: Always use manual `xcrun devicectl` commands for guaranteed installation

### ERROR MESSAGES AND THEIR MEANINGS:
- `"Build Succeeded" but nothing happens` → Use manual install commands
- `"Signing certificate is invalid...serial number..."` → Add `-allowProvisioningUpdates`
- `"App installed:" in terminal` → Success! App is on phone
- `"No such file or directory" for DerivedData` → Already clean, proceed to build
- `"Run script build phase '[CP] Embed Pods Frameworks' will be run during every build"` → Just a warning, ignore

### COMPLETE REBUILD WORKFLOW (NUCLEAR OPTION):
```bash
# 1. Build the web assets
npm run build

# 2. Sync with iOS
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
npx cap sync ios
# Expected: "✔ update ios in X.XXs"

# 3. Clean EVERYTHING in Xcode
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
pod deintegrate && pod install
# Expected: "Pod installation complete!"

# 4. Build with certificate renewal
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates clean build 2>&1 | tail -5
# Expected final line: "** BUILD SUCCEEDED **"

# 5. Install and launch (ONE COMMAND)
xcrun devicectl device install app --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device 00008140-001A39900162801C com.artrio.artrio

# Expected output sequence:
# "01:21:54  Acquired tunnel connection to device."
# "App installed:"
# "bundleID: com.artrio.artrio"
# "Launched application with com.artrio.artrio bundle identifier"
```

### EXAMPLE OF ACTUAL SUCCESS OUTPUT:
```
01:21:54  Acquired tunnel connection to device.
01:21:54  Enabling developer disk image services.
01:21:54  Acquired usage assertion.
App installed:
• bundleID: com.artrio.artrio
• installationURL: file:///private/var/containers/Bundle/Application/[UUID]/App.app/
• launchServicesIdentifier: unknown
• databaseUUID: BBF7EC98-5DF7-487B-B151-400D727D8A5D
• databaseSequenceNumber: 2696
• options: 
01:21:56  Acquired tunnel connection to device.
01:21:56  Enabling developer disk image services.
01:21:56  Acquired usage assertion.
Launched application with com.artrio.artrio bundle identifier.
```

### QUICK DIAGNOSIS CHECKLIST:
1. Tyler says "won't install" → Start with Step 1 (Clean DerivedData)
2. See "certificate invalid" → Use `-allowProvisioningUpdates`
3. Build succeeds but no app → Skip to Step 4 (Manual install)
4. Everything fails → Use COMPLETE REBUILD WORKFLOW

## Challenge Analysis Protocol

- When I say "tackle this challenge", follow a systematic architectural audit:
  - Define the ACTUAL problem, not just symptoms
  - Map current architecture and component interactions
  - Question the existence and purpose of each component
  - Identify overlaps and conflicts between components
  - Conduct rigorous scale checks (at 10x, 100x, 1000x load)
  - Explore solution space with minimal changes
  - Assess scalability, maintainability, and potential technical debt
  - Prioritize simplicity and potential for deletion over adding complexity
  - Always evaluate solutions through the lens of potential wild success

## Delegation Protocol

- When Tyler says "delegate this", use the other Claude instances that are connected to the git worktree
- The worktrees are set up for parallel development with multiple Claude instances acting as specialized developers
- Coordinate with the team of Claude instances for complex tasks

## Result Verification Protocol

- Any time the results are in, cross-check Orion's answers with the verified answers found in the database/CSV files
- Analyze and identify why Orion wasn't able to correctly answer the questions