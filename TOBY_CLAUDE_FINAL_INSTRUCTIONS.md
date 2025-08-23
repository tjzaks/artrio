# FINAL Instructions for Toby's Claude - Git Only Access

## Copy This ENTIRE Message to Your Claude:

---

Hi Claude! I'm Toby. I work on the Artrio project with Tyler. 

## CRITICAL SETUP INFO
- **I access the project through Git only** (I cloned it locally)
- **My local path:** `/Users/toby/artrio` (or wherever I cloned it)
- **I work on:** `dev` branch
- **Tyler works on:** `main` branch
- **Tyler communicates through:** GitHub issues and git commits

## When I Start Work

When I say: "Let's start" or "Good morning"

You should run:
```bash
cd ~/artrio  # Or wherever I cloned the project
git checkout dev
git fetch origin
git pull origin main  # Get Tyler's latest changes
git pull origin dev   # Get my latest dev work
echo "Checking what Tyler changed..."
git log origin/main --oneline -5
gh issue list --assignee toby --label "toby-task" --state open
```

## When Tyler Updates Something

When I say ANY of these:
- "Tyler pushed an update"
- "Tyler made changes"
- "Sync with Tyler"
- "Get latest from Tyler"

IMMEDIATELY run:
```bash
cd ~/artrio
git fetch origin
git pull origin main  # Pull Tyler's changes into dev
echo "Tyler's recent changes:"
git log --oneline -5 --author="Tyler"

# Then rebuild for my iPhone
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[MY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device [MY_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device [MY_DEVICE_ID] com.artrio.artrio

echo "✅ Tyler's changes are now on your phone!"
```

## When Tyler Gives Me Tasks

When I say:
- "Tyler said to fix something"
- "Check what Tyler assigned"
- "Tyler wants me to work on something"

Run:
```bash
# Check GitHub for new issues
gh issue list --assignee toby --label "toby-task" --state open

# If there's a specific issue number mentioned
gh issue view [number]
```

## Working on Issues

When I say: "Work on issue 5"

1. First, make sure we're synced:
```bash
cd ~/artrio
git checkout dev
git pull origin main  # Always get Tyler's latest first
```

2. View the issue:
```bash
gh issue view 5
```

3. The issue will mention files like `/src/pages/Messages.tsx`
   - This means: `~/artrio/src/pages/Messages.tsx` in my local clone
   - Read that file with your Read tool
   - Make ONLY the changes specified

4. After changes:
```bash
npm run lint
npm run build
```

## Testing on My iPhone

When I say: "rebuild", "test on phone", "install"

Run immediately:
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

## Committing My Work

When I say: "It works" or "Commit this"

```bash
cd ~/artrio
git add -A
git status  # Show me what we're committing
git commit -m "Fix: [issue title] (#[issue number])"
git push origin dev
gh issue close [number] --comment "✅ Completed and tested. Pushed to dev for Tyler's review."
```

## Understanding Tyler's Communication

### Through Git Commits
```bash
# See what Tyler has been working on
git log origin/main --oneline -10 --author="Tyler"

# See what files Tyler changed
git diff dev..origin/main --stat
```

### Through GitHub Issues
```bash
# Tyler creates issues with exact instructions
gh issue list --assignee toby --label "toby-task"

# Each issue has:
# - Exact file paths (relative to project root)
# - Exact code to find
# - Exact code to replace
# - How to test
```

### Through PR Comments
```bash
# If Tyler comments on your work
gh pr list --author toby
gh pr view [number]
```

## My Daily Workflow

1. **Start Day:**
   - "Let's start" → Syncs with Tyler's main
   
2. **Check Tasks:**
   - "What are my tasks?" → Lists GitHub issues
   
3. **Work on Task:**
   - "Work on issue 5" → Views issue, makes changes
   
4. **Test:**
   - "Rebuild on phone" → Builds and installs
   
5. **Complete:**
   - "It works, commit" → Pushes to dev

6. **Stay Synced:**
   - "Tyler pushed updates" → Pulls from main

## File Paths Translation

When GitHub issue says: `/src/pages/Messages.tsx`
I access it at: `~/artrio/src/pages/Messages.tsx`

When issue says: "Line 142"
You should: Use Read tool on `~/artrio/src/pages/Messages.tsx` and find line 142

## IMPORTANT NOTES

- I DON'T have access to Tyler's `/Users/tyler/` directories
- I work in MY local clone of the repo
- Tyler communicates through Git and GitHub only
- Always pull from main before starting work
- Always push to dev, never to main
- Tyler will merge my dev work when ready

## Quick Commands

| I say | You do |
|-------|--------|
| "start work" | Pull from main, list issues |
| "tyler updated" | Pull from main, rebuild |
| "issue 5" | View issue, make changes |
| "rebuild" | Build and install on iPhone |
| "commit" | Push to dev branch |

Remember: Tyler can't directly talk to me or you. He communicates through:
1. GitHub issues (tasks)
2. Git commits (code changes)
3. PR reviews (feedback)

Let's start with: "Let's start work"

---

## For Tyler: What This Handles

This setup accounts for:
- Toby only has his local git clone
- No access to your `/Users/tyler/` paths  
- Communication only through git/GitHub
- Clear path translation (issue path → local path)
- Automatic sync when Tyler is mentioned
- Always pulls your changes before working