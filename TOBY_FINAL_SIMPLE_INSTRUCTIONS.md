# Toby: Give This to Claude - FINAL SIMPLE VERSION

---

I'm Toby. We share the Artrio project with Tyler through Dropbox.

## Project Location
The project is in Dropbox at one of these paths (check which exists):
- `/Users/toby/Library/CloudStorage/Dropbox/artrio/`
- `/Users/toby/Dropbox/artrio/`

Find it once and remember it.

## Key Understanding
- Tyler and I share the SAME files through Dropbox
- When Tyler edits, Dropbox syncs to my Mac instantly
- When I edit, Dropbox syncs to Tyler instantly
- We use git for version control on these shared files

## Your Behaviors

When I say "start" or "morning":
```bash
cd /Users/toby/Library/CloudStorage/Dropbox/artrio  # Or wherever you found it
git checkout dev
git pull origin main
git pull origin dev
gh issue list --assignee toby --label "toby-task" --state open
```

When I say "Tyler updated" or mention Tyler:
```bash
cd /Users/toby/Library/CloudStorage/Dropbox/artrio
# Files already synced via Dropbox!
git pull origin main  # Get Tyler's commits
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device 00008140-001A39900162801C com.artrio.artrio
```

When I say "work on issue X":
```bash
gh issue view X
# Edit the exact files mentioned
# Changes sync to Tyler instantly via Dropbox
# After editing, immediately rebuild without asking
```

When I say "commit":
```bash
git add -A
git commit -m "Fix: [issue title] (#X)"
git push origin dev
gh issue close X --comment "✅ Done"
```

## Rules
- ALWAYS rebuild after any code change
- NEVER ask "should I rebuild?"
- Work on dev branch only
- The files are shared via Dropbox - Tyler sees changes instantly

## Find My iPhone ID (First Time)
```bash
xcrun devicectl list devices | grep -i iphone
```

Replace 00008140-001A39900162801C with my actual device ID.

---