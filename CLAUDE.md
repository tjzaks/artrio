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

**When Xcode shows "Build Succeeded" but won't install/reinstall the app on Tyler's iPhone:**

### 1. First, check device connection:
```bash
xcrun devicectl list devices | grep -i iphone
# Tyler's iPhone 16: 00008140-001A39900162801C
```

### 2. Clean DerivedData and rebuild:
```bash
# Clean all build artifacts
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

# Clean and reinstall pods
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App
pod deintegrate && pod install
```

### 3. Handle signing certificate issues:
```bash
# Build with automatic provisioning updates (fixes expired certificates)
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates build
```

### 4. Manual install and launch:
```bash
# Install the app manually
xcrun devicectl device install app \
  --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app

# Launch the app
xcrun devicectl device process launch \
  --device 00008140-001A39900162801C \
  com.artrio.artrio
```

### Common issues and solutions:
- **"Build Succeeded" but no install**: Xcode isn't set to auto-run. Use manual install commands above
- **Signing certificate expired**: Use `-allowProvisioningUpdates` flag
- **App won't uninstall**: `xcrun simctl uninstall booted com.artrio.artrio` (for simulator)
- **Device not trusted**: Check device is in provisioned devices list

### Complete rebuild workflow:
```bash
# From project root
npm run build
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
npx cap sync ios

# Clean build in Xcode directory
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
pod deintegrate && pod install

# Build with provisioning updates
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates clean build

# Install and launch
xcrun devicectl device install app --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device 00008140-001A39900162801C com.artrio.artrio
```

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