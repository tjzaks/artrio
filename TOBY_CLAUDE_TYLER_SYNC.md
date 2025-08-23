# Instructions for Toby's Claude: Handling Tyler Updates

## CRITICAL: Add This to Toby's Claude Setup

### When Toby Says Tyler Updated Something

When Toby says ANY of these:
- "Tyler just pushed an update"
- "Tyler made changes"
- "Tyler fixed something"
- "Tyler said to pull latest"
- "Get Tyler's changes"
- "Sync with Tyler"
- "Tyler updated main"

**IMMEDIATELY RUN THIS SEQUENCE (no questions asked):**

```bash
# 1. Save any current work
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
git stash

# 2. Switch to dev and sync with Tyler's main
git checkout dev
git fetch origin main
git pull origin main
echo "✅ Synced with Tyler's latest changes from main"

# 3. Apply any stashed work
git stash pop 2>/dev/null || echo "No local changes to restore"

# 4. AUTOMATICALLY rebuild and install on Toby's phone
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[TOBY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device [TOBY_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device [TOBY_DEVICE_ID] com.artrio.artrio

echo "✅ Tyler's changes are now on your phone!"
```

### When Toby Says Tyler Gave Instructions

When Toby says ANY of these:
- "Tyler said to [do something]"
- "Tyler wants me to [fix something]"
- "Tyler told me to [work on something]"
- "Tyler assigned me [a task]"
- "Tyler found a bug"

**IMMEDIATELY DO:**

```bash
# 1. Check for new GitHub issues
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
gh issue list --assignee toby --label "toby-task" --state open --limit 5

# 2. If there's a new issue, view the latest one
gh issue view [latest issue number]
```

Then say: "I see Tyler assigned you issue #[X]. Should we start working on it?"

### When Toby Starts His Day

When Toby says:
- "Let's start"
- "Good morning"
- "I'm ready to work"
- "What's new"

**ALWAYS START WITH:**

```bash
# 1. Check for Tyler's overnight changes
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
git checkout dev
git fetch origin main
git status

# 2. See what Tyler changed
echo "Checking what Tyler updated..."
git log origin/main --oneline -5

# 3. Pull Tyler's changes
git pull origin main

# 4. Check for new tasks
gh issue list --assignee toby --label "toby-task" --state open

# 5. Auto-build with latest changes
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[TOBY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device [TOBY_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device [TOBY_DEVICE_ID] com.artrio.artrio

echo "✅ Ready to work! You have Tyler's latest changes and the app is on your phone."
```

## Quick Reference for Common Scenarios

| Toby says | Claude should |
|-----------|---------------|
| "Tyler pushed an update" | Pull from main → Auto rebuild on phone |
| "Tyler fixed the bug" | Pull from main → Auto rebuild → Say "Tyler's fix is now on your phone" |
| "Tyler said to check issue 5" | `gh issue view 5` → Show the issue |
| "Did Tyler assign anything new?" | `gh issue list --assignee toby` |
| "Tyler wants me to test something" | Pull latest → Rebuild → "Ready to test Tyler's changes" |

## The Key Pattern

**Whenever Tyler is mentioned:**
1. **PULL** from main (get his changes)
2. **BUILD** for iPhone (apply changes)
3. **INSTALL** automatically (no asking)
4. **CONFIRM** it's ready

## Example Conversations

### Scenario 1: Tyler Fixed Something
**Toby:** "Tyler just fixed the login bug"

**Claude:** *immediately runs sync and build sequence*
"✅ I've pulled Tyler's login fix and it's now running on your phone. The app just launched with his changes!"

### Scenario 2: Tyler Assigns Work
**Toby:** "Tyler said he found a bug for me to fix"

**Claude:** *checks GitHub issues*
"I see Tyler created issue #8: 'Fix profile image border color'. Should we start working on it?"

### Scenario 3: Morning Sync
**Toby:** "Good morning, let's get started"

**Claude:** *runs full morning sync sequence*
"Good morning! I've synced with Tyler's latest changes from overnight. You have 2 new tasks assigned and the app is updated on your phone with his latest code."

## IMPORTANT RULES

### ALWAYS:
- Pull Tyler's changes when his name is mentioned
- Auto-rebuild after pulling (don't ask)
- Check for new issues when Tyler gives instructions
- Start each day by syncing with main

### NEVER:
- Ask "Should I pull Tyler's changes?" - just do it
- Wait to rebuild - do it automatically
- Ignore Tyler mentions - they always mean action needed
- Work on old code - always sync first

## The Magic Words

When Toby mentions "Tyler" + any action word (pushed, fixed, updated, said, wants), that's your trigger to:
1. Sync with main
2. Rebuild for iPhone
3. Check for new instructions

This keeps Toby always working with Tyler's latest code!