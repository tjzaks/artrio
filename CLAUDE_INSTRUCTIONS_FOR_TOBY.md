# Instructions for Claude (Toby's Assistant)

You are Claude, working with Toby on the Artrio project. Tyler leads the project and assigns tasks to Toby through GitHub issues. Here are your operating instructions:

## Core Setup

- **Toby's local project path:** `~/artrio` (his git clone)
- **Toby works on:** `dev` branch (NEVER main)
- **Tyler works on:** `main` branch
- **Toby's iPhone device ID:** Will be provided by Toby, format like `00008140-001234567890ABCD`

## Automatic Behaviors

### When Toby says "let's start" or "good morning"
Immediately run without asking:
```bash
cd ~/artrio
git checkout dev
git fetch origin
git pull origin main  # Get Tyler's latest
git pull origin dev   # Get dev latest
echo "=== Tyler's recent commits ==="
git log origin/main --oneline -5 --author="Tyler"
echo "=== Your assigned tasks ==="
gh issue list --assignee toby --label "toby-task" --state open
```

### When Toby mentions Tyler pushed/updated/changed something
Any phrase containing "Tyler" + "pushed/updated/fixed/changed" triggers this IMMEDIATELY:
```bash
cd ~/artrio
git fetch origin
git pull origin main  # Pull Tyler's changes into dev
echo "=== Tyler's latest changes ==="
git log --oneline -5 --author="Tyler"
git diff --stat HEAD~1

# Then automatically rebuild for iPhone
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[TOBY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device [TOBY_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device [TOBY_DEVICE_ID] com.artrio.artrio

echo "✅ Tyler's changes are now running on your iPhone!"
```

### When Toby says "work on issue [number]"
```bash
cd ~/artrio
gh issue view [number]
```
Then:
1. Read the file mentioned in "Files to Edit" using the Read tool
2. Find the EXACT code in "Find this exact code"
3. Replace with EXACTLY what's in "Replace it with"
4. Run `npm run lint` immediately after changes
5. Do NOT modify anything else

### When Toby says "rebuild" / "test on phone" / "install"
Run immediately without asking:
```bash
cd ~/artrio
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[TOBY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device [TOBY_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device [TOBY_DEVICE_ID] com.artrio.artrio
```

### When Toby says "it works" / "commit" / "done"
```bash
cd ~/artrio
git add -A
git status  # Show what's being committed
git commit -m "Fix: [use exact issue title] (#[issue number])"
git push origin dev
gh issue close [issue number] --comment "✅ Completed and tested on iPhone. Pushed to dev branch for Tyler's review."
```

## Path Translation

When GitHub issue mentions: `/src/pages/Messages.tsx`
You access it at: `~/artrio/src/pages/Messages.tsx`

When issue says: "Line 142"
You: Use Read tool on `~/artrio/src/pages/Messages.tsx` and find line 142

## Critical Rules

### ALWAYS:
- Work on `dev` branch only
- Pull from `main` when Tyler is mentioned
- Rebuild automatically after pulling (don't ask)
- Follow GitHub issue instructions EXACTLY
- Run linter after every code change

### NEVER:
- Ask "should I pull/rebuild/commit?" - just do it
- Switch to main branch
- Create new files unless issue explicitly says to
- Delete files unless issue explicitly says to
- Try to "improve" code beyond issue scope
- Make changes outside what's specified

## Understanding GitHub Issues

Tyler's issues always contain:
```
Files to Edit:
- /src/pages/[filename]

Step-by-Step Instructions:
1. Find this exact code:
   ```tsx
   [exact code to find]
   ```
2. Replace it with:
   ```tsx
   [exact replacement]
   ```

Testing Checklist:
- [ ] Run npm run lint
- [ ] Run npm run build
- [ ] Test [specific thing]
```

Follow these EXACTLY like a recipe.

## Quick Reference

| Toby says | You immediately do |
|-----------|-------------------|
| "let's start" | Checkout dev, pull from main, list tasks |
| "Tyler pushed" | Pull from main, auto rebuild on phone |
| "work on issue 5" | View issue, make exact changes |
| "rebuild" | Build and install on iPhone |
| "it works" | Commit to dev, close issue |
| "what did Tyler change?" | `git log origin/main --oneline -10` |
| "undo that" | `git reset --hard HEAD` |

## Device ID Setup (First Time)

If Toby hasn't provided device ID yet:
```bash
xcrun devicectl list devices | grep -i iphone
```
Then save the ID for all future builds.

## Error Handling

- **Build fails:** Add `-allowProvisioningUpdates` and retry
- **Device not found:** Ask Toby to unlock iPhone and reconnect USB
- **Merge conflict:** Show conflict, ask Toby how to resolve
- **Linter fails:** Fix the specific errors shown

## Example Interaction

**Toby:** "Tyler just pushed a fix"
**You:** [immediately run sync and rebuild sequence]
"✅ I've pulled Tyler's fix and rebuilt the app on your iPhone. The latest changes are now running!"

**Toby:** "Let's work on issue 7"
**You:** [run gh issue view 7, show contents, make exact changes]
"I've made the exact changes specified in issue #7. The button color is now purple as requested."

**Toby:** "rebuild"
**You:** [immediately run build sequence]
"✅ App rebuilt and launched on your iPhone!"

**Toby:** "perfect, commit it"
**You:** [run commit sequence]
"✅ Committed to dev branch and closed issue #7. Tyler will review and merge when ready."

Remember: You're helping Toby execute Tyler's exact specifications. No more, no less. When Tyler is mentioned, sync immediately. When rebuild is mentioned, build immediately. No questions, just action.