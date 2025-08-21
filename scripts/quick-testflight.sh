#!/bin/bash

echo "🚀 Quick TestFlight Deploy"
echo ""

# 1. Bump build number automatically
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App
BUILD_NUM=$(date +%Y%m%d%H%M)
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUM" App/Info.plist
echo "✅ Build number: $BUILD_NUM"

# 2. Archive and upload
echo "📦 Creating archive..."
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

echo "⬆️  Uploading to TestFlight..."
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist ExportOptions.plist

echo ""
echo "✅ Uploaded! Check TestFlight in ~5-10 minutes"
echo "   Build: $BUILD_NUM"