#!/bin/bash

# Generate iOS App Icons from the new logo
# Uses white background version for App Store icon

SOURCE_NO_BG="assets/new-artrio-logo-no-background.png"
SOURCE_WHITE_BG="assets/new-artrio-logo-white-background.png"
DEST_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"

echo "Generating iOS App Icons..."

# App Store icon (1024x1024) - use white background version
sips -z 1024 1024 "$SOURCE_WHITE_BG" --out "$DEST_DIR/AppIcon-1024.png"

# All other icons - use no background version
# iPhone Notification icons
sips -z 20 20 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-20.png"
sips -z 40 40 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-20@2x.png"
sips -z 60 60 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-20@3x.png"

# iPhone Settings icons
sips -z 29 29 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-29.png"
sips -z 58 58 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-29@2x.png"
sips -z 87 87 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-29@3x.png"

# iPhone Spotlight icons
sips -z 40 40 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-40.png"
sips -z 80 80 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-40@2x.png"
sips -z 120 120 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-40@3x.png"

# iPhone App icons
sips -z 120 120 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-60@2x.png"
sips -z 180 180 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-60@3x.png"

# iPad icons
sips -z 76 76 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-76.png"
sips -z 152 152 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-76@2x.png"
sips -z 167 167 "$SOURCE_NO_BG" --out "$DEST_DIR/AppIcon-83.5@2x.png"

echo "iOS App Icons generated successfully!"