#!/bin/bash

# Generate iOS Splash Screens with new logo
SOURCE="assets/new-artrio-logo-no-background.png"
DEST_DIR="ios/App/App/Assets.xcassets/Splash.imageset"

echo "Generating iOS Splash Screens..."

# Create a white background splash screen with the logo centered
# iOS requires 2732x2732 for universal splash

# Using ImageMagick's convert if available, otherwise use sips
if command -v convert &> /dev/null; then
    # ImageMagick approach
    convert -size 2732x2732 xc:white \
            "$SOURCE" -resize 800x800 -gravity center -composite \
            "$DEST_DIR/splash-2732x2732.png"
    
    cp "$DEST_DIR/splash-2732x2732.png" "$DEST_DIR/splash-2732x2732-1.png"
    cp "$DEST_DIR/splash-2732x2732.png" "$DEST_DIR/splash-2732x2732-2.png"
else
    # macOS sips approach - create white background then composite
    # First create a white background
    echo "Creating splash screens with sips..."
    
    # Create a temporary white image
    sips -z 2732 2732 assets/new-artrio-logo-white-background.png --out "$DEST_DIR/splash-2732x2732.png"
    
    # Copy to other required files
    cp "$DEST_DIR/splash-2732x2732.png" "$DEST_DIR/splash-2732x2732-1.png"
    cp "$DEST_DIR/splash-2732x2732.png" "$DEST_DIR/splash-2732x2732-2.png"
fi

echo "iOS Splash Screens generated successfully!"