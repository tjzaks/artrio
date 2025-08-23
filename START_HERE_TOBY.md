# 🚀 START HERE - Toby's Complete Setup Guide

## Step 1: Clone the Project (If You Haven't Already)
```bash
cd ~
git clone https://github.com/tjzaks/artrio.git
cd artrio
```

## Step 2: Find Your iPhone Device ID (One Time Only)
1. Connect your iPhone to your Mac via USB
2. Open Terminal and run:
```bash
xcrun devicectl list devices | grep -i iphone
```
3. You'll see something like: `Toby's iPhone    00008140-001234567890ABCD`
4. Save that long number - that's your device ID!

## Step 3: Copy This EXACT Message to Claude Code

Copy everything below and paste it as your FIRST message to Claude:

---

Hi Claude! I'm Toby. I work on the Artrio project with Tyler.

My setup:
- Project location: `~/artrio` (my local clone)
- My branch: `dev` (I NEVER work on main)
- Tyler's branch: `main` (he merges my work)
- My iPhone ID: [PASTE YOUR DEVICE ID HERE]

When I say "let's start", run:
```bash
cd ~/artrio
git checkout dev
git fetch origin
git pull origin main
git pull origin dev
gh issue list --assignee toby --label "toby-task" --state open
```

When I say "Tyler pushed" or "sync with Tyler", IMMEDIATELY run:
```bash
cd ~/artrio
git fetch origin
git pull origin main
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -destination 'id=[MY_DEVICE_ID]' -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device [MY_DEVICE_ID] ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && xcrun devicectl device process launch --device [MY_DEVICE_ID] com.artrio.artrio
```

When I say "work on issue X", run:
```bash
gh issue view X
```
Then follow the instructions EXACTLY. Only change what it says.

When I say "rebuild" or "test on phone", run the build sequence above.

When I say "commit", run:
```bash
git add -A
git commit -m "Fix: [issue title] (#[issue number])"
git push origin dev
gh issue close [number] --comment "✅ Completed and tested on iPhone"
```

IMPORTANT RULES:
- ALWAYS pull from main when Tyler is mentioned
- NEVER ask "should I rebuild?" - just do it
- Follow issue instructions EXACTLY
- Only work on dev branch

Let's start!

---

## Step 4: Your Daily Workflow

### Starting Your Day
Say to Claude: **"Let's start"**
- Claude syncs with Tyler's latest code
- Shows you assigned tasks
- Rebuilds app on your phone

### Working on Tasks
Say to Claude: **"Work on issue 5"**
- Claude shows the issue
- Makes the exact changes
- You verify the changes look right

### Testing
Say to Claude: **"Rebuild on my phone"**
- Claude builds and installs automatically
- App launches on your iPhone
- You test the specific fix

### Completing
Say to Claude: **"It works, commit it"**
- Claude commits to dev branch
- Closes the GitHub issue
- Tyler gets notified

### When Tyler Updates
Say to Claude: **"Tyler pushed an update"**
- Claude pulls his changes
- Rebuilds on your phone automatically
- You're ready to continue with latest code

## Commands Cheat Sheet

| You Say | Claude Does |
|---------|------------|
| "let's start" | Setup dev branch, show tasks |
| "my tasks" | List your GitHub issues |
| "issue 5" | Start working on issue #5 |
| "tyler pushed" | Sync with main, rebuild |
| "rebuild" | Install on your iPhone |
| "commit" | Push to dev, close issue |

## Need Help?

1. **If build fails:** "The build failed, please fix it"
2. **If confused:** "Let's start over with issue X"
3. **If phone not detected:** Unplug and replug USB, unlock phone
4. **Check Tyler's changes:** "What did Tyler change?"

## Remember

- You work on `dev` branch
- Tyler works on `main` branch
- Tyler creates issues with EXACT instructions
- Follow them like a recipe
- Don't improvise or "improve" - just follow
- Test everything on your real iPhone

## For More Details

After you're comfortable, check these files in the repo:
- `TOBY_WORKFLOW_GUIDE.md` - Detailed workflow
- `TOBY_XCODE_SETUP.md` - Xcode troubleshooting
- `TOBY_CLAUDE_FINAL_INSTRUCTIONS.md` - Complete Claude reference

But this START_HERE file has everything you need to begin!