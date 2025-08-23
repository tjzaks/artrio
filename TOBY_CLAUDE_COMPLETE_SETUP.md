# EXACT Instructions for Toby's Claude Code

## Copy This ENTIRE Message to Start Your Claude Session:

---

Hi Claude! I'm Toby. I work on the Artrio project with Tyler. Here's EXACTLY how we work:

## Critical Info
- **Project location:** `/Users/tyler/Library/CloudStorage/Dropbox/artrio`
- **My branch:** `dev` (I ALWAYS work on dev, never main)
- **Tyler's branch:** `main` (he merges my work when ready)
- **My iPhone ID:** [We'll find this together first time]

## First Thing When I Start
I'll say: "Let's start work"

You should IMMEDIATELY run:
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
git checkout dev
git pull origin dev
git pull origin main
echo "✅ On dev branch and synced with main"
```

## Checking My Tasks
When I say: "what are my tasks" or "check my tasks"

Run EXACTLY:
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
gh issue list --assignee toby --label "toby-task" --state open
```

## Working on an Issue
When I say: "let's do issue 5" or "work on #5"

You should:
```bash
# 1. First, view the issue
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
gh issue view 5

# 2. Comment that we're starting
gh issue comment 5 --body "Starting work on this now"
```

Then follow the issue instructions EXACTLY:
- The issue will say "Files to Edit: `/src/pages/Messages.tsx`"
- That means the FULL path is: `/Users/tyler/Library/CloudStorage/Dropbox/artrio/src/pages/Messages.tsx`
- Use the Read tool to read that EXACT file
- Find the EXACT code mentioned in "Find this exact code"
- Replace with EXACTLY what's in "Replace it with"
- Don't change ANYTHING else

## Testing on My iPhone
When I say ANY of these:
- "rebuild on my phone"
- "test on iphone"
- "install it"
- "xcode mode"

RUN THIS IMMEDIATELY (don't ask, just run):
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
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

Note: We'll replace 00008140-001A39900162801C with my actual device ID

## When Testing is Done
When I say: "it works" or "tests pass" or "commit this"

Run EXACTLY:
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
git add -A
git status  # Show me what we're committing
git commit -m "Fix: [exact issue title] (#[issue number])"
git push origin dev
gh issue close [issue number] --comment "✅ Completed and tested on iPhone. Changes pushed to dev branch."
```

## CRITICAL RULES

### File Paths
- Issue says: `/src/pages/Messages.tsx`
- Full path is: `/Users/tyler/Library/CloudStorage/Dropbox/artrio/src/pages/Messages.tsx`
- ALWAYS use full absolute paths

### Branch Rules
- ALWAYS work on `dev` branch
- NEVER switch to `main`
- ALWAYS pull from main to stay updated
- Push to `dev`, Tyler merges to `main`

### What You Should Do
- Follow issue instructions EXACTLY
- When I say "rebuild", do it immediately
- Show me what files changed before committing
- Run linter after every change

### What You Should NEVER Do
- Don't create new files unless issue says so
- Don't delete files unless issue says so
- Don't "improve" code beyond the issue
- Don't switch to main branch
- Don't ask "should I rebuild?" - just do it

## Example Full Workflow

**Me:** "Let's start work"

**You:** 
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
git checkout dev
git pull origin dev
git pull origin main
```
"✅ On dev branch and synced!"

**Me:** "What are my tasks?"

**You:**
```bash
gh issue list --assignee toby --label "toby-task"
```
"You have 3 tasks:
- #5: Fix button color
- #6: Add loading spinner
- #7: Update placeholder"

**Me:** "Let's do issue 5"

**You:**
```bash
gh issue view 5
```
*Shows issue content*
"I see the issue. It says to edit `/src/pages/Messages.tsx`. Let me read that file first..."
*Uses Read tool on `/Users/tyler/Library/CloudStorage/Dropbox/artrio/src/pages/Messages.tsx`*
*Makes EXACT changes specified*
"Changes made! The button color is now updated."

**Me:** "Rebuild on my phone"

**You:** *Immediately runs full build sequence*
"✅ App rebuilt and launched on your iPhone!"

**Me:** "Perfect it works! Commit it"

**You:**
```bash
git add -A
git commit -m "Fix: Fix button color in Messages (#5)"
git push origin dev
gh issue close 5 --comment "✅ Completed and tested on iPhone. Changes pushed to dev branch."
```
"Done! Issue #5 is closed and changes are on dev branch."

## Finding My Device ID (First Time Only)

**Me:** "Help me find my device ID"

**You:**
```bash
xcrun devicectl list devices | grep -i iphone
```
"I see: Toby's iPhone - ID: 00008140-XXXXXXXXXXXXX
Let me save this for future builds..."

Then update all the build commands with my actual ID.

## Quick Commands I Use

| I say | You immediately do |
|-------|-------------------|
| "start work" | checkout dev, pull from main |
| "my tasks" | list GitHub issues |
| "issue 5" | view and start issue #5 |
| "rebuild" | full Xcode build and install |
| "commit" | add, commit, push to dev |
| "undo" | `git reset --hard HEAD` |

Remember: The GitHub issues have EXACT instructions. Follow them like a recipe. Don't think, just follow!

Let's start by me saying: "Let's start work"

---

## For Tyler: What This Does

This gives Toby's Claude:
1. Exact project location
2. Clear branch strategy (dev only)
3. Full absolute paths
4. Automatic Xcode builds
5. Proper git workflow

Toby just says simple commands and Claude handles everything!