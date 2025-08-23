#!/bin/bash

# Script to generate all iOS app icon sizes from the white background logo

SOURCE_IMAGE="/Users/tyler/Library/CloudStorage/Dropbox/artrio/assets/Original Artrio Logo/artrio-original-logo-white-background.png"
ICON_DIR="/Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App/App/Assets.xcassets/AppIcon.appiconset"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

echo "Generating iOS app icons from white background logo..."

# Generate all required sizes
sips -z 20 20 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-20.png"
sips -z 40 40 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-20@2x.png"
sips -z 60 60 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-20@3x.png"
sips -z 29 29 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-29.png"
sips -z 58 58 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-29@2x.png"
sips -z 87 87 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-29@3x.png"
sips -z 40 40 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-40.png"
sips -z 80 80 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-40@2x.png"
sips -z 120 120 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-40@3x.png"
sips -z 120 120 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-60@2x.png"
sips -z 180 180 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-60@3x.png"
sips -z 76 76 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-76.png"
sips -z 152 152 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-76@2x.png"
sips -z 167 167 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-83.5@2x.png"
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$ICON_DIR/AppIcon-1024.png"

echo "iOS app icons updated successfully!"