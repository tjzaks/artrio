# CRITICAL: Toby's Initial Setup - Getting Files Locally

## Toby: Give This to Claude FIRST (Before Anything Else)

---

Claude, we need to set up the Artrio project on Toby's Mac. Toby doesn't have the files yet - we need to download them from GitHub first.

## Step 1: Clone the Project (One Time Only)

Run this to download all the project files to Toby's computer:
```bash
cd ~
git clone https://github.com/tjzaks/artrio.git
cd artrio
git checkout -b dev origin/dev  # Create local dev branch tracking remote dev
echo "✅ Project downloaded to ~/artrio"
ls -la  # Show all the files we just downloaded
```

## Step 2: Install Dependencies (Required for Building)

```bash
cd ~/artrio
npm install  # Install all JavaScript dependencies
echo "✅ Dependencies installed"
```

## Step 3: Set Up iOS Project

```bash
cd ~/artrio/ios/App
pod install  # Install iOS dependencies
echo "✅ iOS dependencies installed"
```

## Step 4: Find Toby's iPhone Device ID

```bash
xcrun devicectl list devices | grep -i iphone
```
Save this ID - we'll use it for all builds!

## Step 5: Test First Build

```bash
cd ~/artrio
npm run build && npx cap sync ios
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[DEVICE_ID_FROM_STEP_4]' \
  -allowProvisioningUpdates build 2>&1 | tail -10
```

If you see "BUILD SUCCEEDED", we're ready!

## IMPORTANT: How Updates Work

Now that Toby has the files locally at `~/artrio`, here's what happens:

### When Tyler pushes changes:
1. Tyler commits to `main` branch on GitHub
2. You run `git pull origin main` 
3. This DOWNLOADS Tyler's changes and UPDATES the local files on Toby's Mac
4. The files in `~/artrio` are now updated with Tyler's changes
5. You rebuild from these updated local files

### The Key Understanding:
- `~/artrio` = Toby's LOCAL copy of the project
- `git pull` = Downloads changes and updates these LOCAL files
- Xcode builds from these LOCAL files at `~/artrio/ios/App`
- Every pull updates the actual files on Toby's Mac

## Your Daily Workflow After Initial Setup

Every time Toby starts work:
```bash
cd ~/artrio
git checkout dev  # Make sure we're on dev branch
git fetch origin  # Check for updates
git pull origin main  # Download Tyler's changes to LOCAL files
git pull origin dev   # Get any dev branch updates
echo "✅ Local files updated with latest changes"
ls -la src/  # See the actual files on Toby's Mac
```

## When Toby Says "Tyler Pushed"

This means: Download Tyler's new code and update the local files:
```bash
cd ~/artrio
git pull origin main  # This DOWNLOADS and UPDATES local files
echo "Files updated locally. Building from updated files..."
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[TOBY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
```

## Verifying Files Are Local

To confirm files exist locally on Toby's Mac:
```bash
# Check project exists
ls -la ~/artrio

# Check source files exist
ls -la ~/artrio/src/pages/
ls -la ~/artrio/src/components/

# Check iOS project exists
ls -la ~/artrio/ios/App/

# See a specific file's contents
cat ~/artrio/src/pages/Messages.tsx | head -20
```

## If Files Are Missing

If `~/artrio` doesn't exist, go back to Step 1 and clone the repo!

## Remember:
- Git clone = Initial download of ALL files to Toby's Mac
- Git pull = Update those local files with new changes
- Xcode builds from `~/artrio/ios/App` (local files)
- Every edit happens on LOCAL files
- Every build uses LOCAL files

---

## For Tyler: What This Solves

This ensures:
1. Toby's Mac has a complete local copy of the project
2. Git pull actually updates the files on disk
3. Xcode builds from real local files, not some nebulous concept
4. Claude understands the physical location of files