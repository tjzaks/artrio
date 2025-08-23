#!/bin/bash

# Force fresh install on iPhone when Xcode won't cooperate

echo "🔧 Forcing fresh Artrio install..."

# Step 1: Build the app first
echo "Building app..."
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App

xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS,name=Tyler*' \
  -derivedDataPath build \
  build

if [ $? -eq 0 ]; then
  echo "✅ Build successful"
  
  # Step 2: Install using ios-deploy (if you have it)
  if command -v ios-deploy &> /dev/null; then
    echo "Installing to device..."
    ios-deploy --bundle build/Build/Products/Debug-iphoneos/App.app
  else
    echo "Install ios-deploy for automatic installation:"
    echo "brew install ios-deploy"
    echo ""
    echo "Or manually install the app at:"
    echo "build/Build/Products/Debug-iphoneos/App.app"
  fi
else
  echo "❌ Build failed"
fi