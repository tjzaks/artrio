#!/bin/bash

echo "🔨 FORCING XCODE TO ACTUALLY REBUILD (not just pretend)"
echo ""

# 1. Kill any hanging processes
echo "1️⃣  Killing any stuck processes..."
killall Xcode 2>/dev/null || true
killall Simulator 2>/dev/null || true
pkill -f "CoreSimulator" 2>/dev/null || true

# 2. Clean EVERYTHING
echo "2️⃣  Cleaning DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "3️⃣  Cleaning iOS build folder..."
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App
rm -rf build/
rm -rf Pods/
rm -rf App.xcworkspace/xcuserdata/

# 3. Force new build number (this tricks Xcode)
echo "4️⃣  Bumping build number to force reinstall..."
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $(date +%s)" App/Info.plist

# 4. Reinstall pods fresh
echo "5️⃣  Reinstalling CocoaPods..."
pod deintegrate && pod install

echo ""
echo "✅ DONE! Now in Xcode:"
echo "   1. Open App.xcworkspace (not .xcodeproj)"
echo "   2. Select your iPhone in the device list"
echo "   3. Hit Cmd+R to run"
echo ""
echo "If it STILL doesn't work:"
echo "   - Unplug and replug your iPhone"
echo "   - Or just use TestFlight (it's more reliable)"