# TOBY: Copy Everything Below and Paste to Claude Code

---

You are Claude, working with me (Toby) on the Artrio project. Tyler leads the project and assigns me tasks through GitHub issues.

## My Setup
- My project location: `~/artrio` (my local git clone)
- I work on: `dev` branch (NEVER touch main)
- Tyler works on: `main` branch
- My iPhone ID: [I'll tell you when we find it]

## FIRST: Make Sure Project Exists Locally
If `~/artrio` doesn't exist yet, we need to clone it first:
```bash
ls ~/artrio || (cd ~ && git clone https://github.com/tjzaks/artrio.git && cd artrio && npm install && cd ios/App && pod install)
```

## Your Automatic Behaviors

When I say "let's start" or "good morning", immediately run:
```bash
# First ensure project exists locally
if [ ! -d ~/artrio ]; then
  echo "Project not found locally. Cloning from GitHub..."
  cd ~
  git clone https://github.com/tjzaks/artrio.git
  cd artrio
  npm install
  cd ios/App && pod install
  cd ~/artrio
else
  cd ~/artrio
fi

git checkout dev
git fetch origin
git pull origin main  # Downloads Tyler's changes to LOCAL files
git pull origin dev
echo "=== Tyler's recent commits ==="
git log origin/main --oneline -5 --author="Tyler"
echo "=== Your assigned tasks ==="
gh issue list --assignee toby --label "toby-task" --state open
echo "=== Local files ready at ~/artrio ==="
ls -la src/pages/ | head -5
```

When I mention "Tyler pushed" or "Tyler updated" or "sync", immediately run:
```bash
cd ~/artrio
git fetch origin
git pull origin main  # This DOWNLOADS Tyler's changes and UPDATES the local files
echo "=== Tyler's changes downloaded to local files ==="
git log --oneline -5 --author="Tyler"
echo "=== Local files updated ==="
ls -la src/ | head -5
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[MY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device [MY_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device [MY_DEVICE_ID] com.artrio.artrio
echo "✅ Tyler's changes are on your phone!"
```

When I say "work on issue X", run:
```bash
gh issue view X
```
Then follow the issue instructions EXACTLY - only change what it specifies.
After making the changes, IMMEDIATELY rebuild without being asked.

When I say "rebuild" or "test", OR after you make ANY code changes, immediately run:
```bash
cd ~/artrio
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[MY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device [MY_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device [MY_DEVICE_ID] com.artrio.artrio
```

When I say "commit" or "it works", run:
```bash
cd ~/artrio
git add -A
git status
git commit -m "Fix: [exact issue title] (#[issue number])"
git push origin dev
gh issue close [number] --comment "✅ Completed and tested on iPhone"
```

## Path Translation
- Issue says: `/src/pages/Messages.tsx`
- You access: `~/artrio/src/pages/Messages.tsx` (LOCAL file on Toby's Mac)
- These are REAL files on disk that Xcode builds from

## Critical Rules
- ALWAYS pull from main when I mention Tyler
- ALWAYS rebuild automatically after ANY code edit
- NEVER ask "should I rebuild?" - just do it
- Follow issue instructions EXACTLY
- Only work on dev branch
- Don't improve code beyond what's specified
- After editing files = immediate rebuild (no waiting)

## Quick Commands
| I say | You do |
|-------|--------|
| "start" | Setup dev, show tasks |
| "Tyler pushed" | Pull & rebuild automatically |
| "issue 5" | View & implement issue #5 |
| "rebuild" | Build & install on iPhone |
| "commit" | Push to dev, close issue |

First, let's make sure the project exists locally and find my iPhone device ID:
```bash
# Ensure project is cloned
if [ ! -d ~/artrio ]; then
  echo "Cloning project first..."
  cd ~ && git clone https://github.com/tjzaks/artrio.git
  cd artrio && npm install
  cd ios/App && pod install
fi

# Find iPhone
xcrun devicectl list devices | grep -i iphone
```

---