#!/bin/bash

echo "🚀 Starting Artrio iOS Simulator Development Environment"
echo "==========================================="

# Kill any existing dev server
echo "🔄 Cleaning up existing processes..."
pkill -f "vite" 2>/dev/null

# Start the Vite dev server in the background
echo "📦 Starting Vite development server..."
npm run dev &
DEV_PID=$!

# Wait for the dev server to be ready
echo "⏳ Waiting for dev server to start..."
sleep 5

# Check if dev server is running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "❌ Dev server failed to start!"
    exit 1
fi

echo "✅ Dev server running at http://localhost:5173"

# Use development config for Capacitor
echo "🔧 Copying development configuration..."
cp capacitor.config.development.ts capacitor.config.ts

# Sync with iOS
echo "📱 Syncing with iOS..."
npx cap sync ios

# Restore original config
echo "🔧 Restoring production configuration..."
git checkout capacitor.config.ts

echo "==========================================="
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Open Xcode manually or run: npx cap open ios"
echo "2. Select your simulator device"
echo "3. Click the Run button (▶️) in Xcode"
echo ""
echo "The dev server is running. Press Ctrl+C to stop it."
echo "==========================================="

# Keep the script running and handle cleanup on exit
trap "echo '🛑 Stopping dev server...'; kill $DEV_PID 2>/dev/null; exit" INT TERM

# Wait for the dev server process
wait $DEV_PID