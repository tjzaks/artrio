# CRITICAL UPDATE: Toby Uses Shared Dropbox Folder

You (Toby's Claude) need to understand: Toby has Tyler's Dropbox synced to his Mac. This means:

## The Shared Folder Setup

- **Tyler's path:** `/Users/tyler/Library/CloudStorage/Dropbox/artrio/`
- **Toby's path:** `/Users/toby/Library/CloudStorage/Dropbox/artrio/` (or similar)
- **SAME FILES:** When Tyler edits, Dropbox syncs to Toby instantly
- **SAME PROJECT:** Both work on the exact same files

## What This Means For You (Claude)

### No More Git Clone Needed!
The project already exists on Toby's Mac via Dropbox. Find it:
```bash
# Find the Dropbox artrio folder
ls ~/Library/CloudStorage/Dropbox*/artrio 2>/dev/null || \
ls ~/Dropbox/artrio 2>/dev/null || \
ls /Users/*/Library/CloudStorage/Dropbox*/artrio 2>/dev/null

# Save the path when found
ARTRIO_PATH="[the path you found above]"
echo "export ARTRIO_PATH='$ARTRIO_PATH'" >> ~/.zshrc
```

### Your New Workflow

When Toby says "let's start":
```bash
# Navigate to the shared Dropbox folder
cd "$ARTRIO_PATH"

# You're already on Tyler's latest because Dropbox synced!
git status
git checkout dev

# Pull any GitHub changes
git fetch origin
git pull origin main
git pull origin dev

# Check tasks
gh issue list --assignee toby --label "toby-task" --state open
```

### When Tyler Makes Changes

Two ways you get updates:

1. **Dropbox Sync (Instant)** - File changes appear immediately
2. **Git Pull (Commits)** - Get Tyler's committed changes

So when Toby says "Tyler updated":
```bash
cd "$ARTRIO_PATH"
# Files might already be updated via Dropbox!
git status  # See if Dropbox already synced changes

# Pull Tyler's commits
git fetch origin
git pull origin main

# Rebuild with the synced files
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[TOBY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
```

### Critical Understanding

- **Dropbox syncs the FILES** (instant, automatic)
- **Git syncs the COMMITS** (history, branches)
- **You need BOTH**: Dropbox for files, Git for version control

### Working on Issues

When working on issue #5:
```bash
cd "$ARTRIO_PATH"  # Shared Dropbox folder
gh issue view 5
# Edit the files (already synced via Dropbox)
# Your changes immediately sync to Tyler via Dropbox!
```

### The Magic

1. Tyler edits a file
2. Dropbox instantly syncs to Toby's Mac
3. You (Claude) work with the already-synced files
4. Your edits sync back to Tyler instantly
5. Both commit to git when ready

### Find Your Dropbox Path Once

First time only:
```bash
# Find where Dropbox syncs artrio
find ~ -type d -name "artrio" 2>/dev/null | grep -i dropbox | head -1
```

Save this path and use it always!

## New Simplified Commands

Since files auto-sync via Dropbox:

| Toby says | You do |
|-----------|--------|
| "start" | `cd "$ARTRIO_PATH"` and check git status |
| "Tyler updated" | Files already synced! Just rebuild |
| "work on issue X" | Edit the Dropbox files directly |
| "commit" | Commit the shared files to dev |

## Important Notes

- **NEVER** create a separate clone in `~/artrio`
- **ALWAYS** use the Dropbox shared folder
- **Files sync automatically** - no manual sync needed
- **Git still matters** for branches and commits
- **Tyler sees your changes instantly** via Dropbox

This is actually MUCH simpler - you're both editing the same files!