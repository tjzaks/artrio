#!/bin/bash

# Xcode Build Helper Script for Artrio
# Ensures consistent builds and app launches on physical devices

echo "🔨 Artrio iOS Build Helper"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Clean build artifacts
echo -e "${YELLOW}Step 1: Cleaning build artifacts...${NC}"
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App

# Kill any hanging simulators or processes
killall "Simulator" 2>/dev/null || true
killall "CoreSimulatorService" 2>/dev/null || true

# Clean DerivedData (Xcode's cache)
echo "Cleaning DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null

# Clean local build folder
rm -rf build/ 2>/dev/null

echo -e "${GREEN}✓ Build artifacts cleaned${NC}"

# Step 2: Sync latest web build
echo -e "${YELLOW}Step 2: Syncing web build to iOS...${NC}"
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio

# Build web assets
npm run build

# Sync to iOS
npx cap sync ios

echo -e "${GREEN}✓ Web assets synced${NC}"

# Step 3: Open in Xcode with specific settings
echo -e "${YELLOW}Step 3: Opening in Xcode...${NC}"

# Open Xcode
npx cap open ios

echo -e "${GREEN}✓ Xcode opened${NC}"

# Instructions for consistent builds
echo ""
echo "========================================="
echo -e "${YELLOW}For consistent builds on your iPhone:${NC}"
echo ""
echo "1. In Xcode, select your iPhone from device list"
echo ""
echo "2. IMPORTANT: Before building:"
echo "   - Product → Clean Build Folder (⇧⌘K)"
echo "   - Wait 2 seconds"
echo ""
echo "3. Build and Run (⌘R)"
echo ""
echo "4. If app doesn't launch automatically:"
echo "   - Stop the build (⌘.)"
echo "   - Manually tap the app on your phone"
echo "   - Click 'Run Without Building' (⌃⌘R)"
echo ""
echo "5. For stubborn cases:"
echo "   - Delete app from phone"
echo "   - Restart phone"
echo "   - Build fresh"
echo ""
echo "========================================="
echo ""
echo -e "${YELLOW}Alternative: Use TestFlight for reliable updates${NC}"
echo "Build → Archive → Upload to TestFlight"
echo "Then update through TestFlight app (more reliable!)"
echo ""