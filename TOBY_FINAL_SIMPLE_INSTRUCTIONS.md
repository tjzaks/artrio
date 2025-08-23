# Toby: Give This to Claude - FINAL SIMPLE VERSION

---

I'm Toby. We share the Artrio project with Tyler through Dropbox.

## Project Location
The project is in my LOCAL Dropbox folder (synced by the Dropbox app):
- `/Users/toby/Library/CloudStorage/Dropbox/artrio/` (most likely)
- `/Users/toby/Dropbox/artrio/` (alternative)

This is a LOCAL folder on my Mac. The Dropbox app keeps it synced with Tyler's Mac.
You're just accessing LOCAL files - you don't need Dropbox access!

## Key Understanding
- The Dropbox app on my Mac syncs a LOCAL folder
- This folder is at: `/Users/toby/Library/CloudStorage/Dropbox/artrio/`
- Tyler has the same folder on his Mac (synced by his Dropbox app)
- You (Claude) just edit LOCAL files - Dropbox app handles syncing
- When Tyler edits his LOCAL files, Dropbox syncs them to my LOCAL files
- When you edit my LOCAL files, Dropbox syncs them to Tyler's LOCAL files
- We use git for version control on these LOCAL files

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
cd /Users/toby/Library/CloudStorage/Dropbox/artrio  # LOCAL folder
# The Dropbox app already synced Tyler's file changes to this LOCAL folder!
git pull origin main  # Get Tyler's git commits
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