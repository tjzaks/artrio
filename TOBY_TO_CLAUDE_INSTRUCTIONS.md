# Instructions FROM Toby TO My Claude Instance

Hey Claude! I'm Toby, and I work on the Artrio project with Tyler. Here's how we work together:

## My Device Info
My iPhone device ID is: [I'll tell you when we set this up]
Project location: `/Users/tyler/Library/CloudStorage/Dropbox/artrio`

## Our Daily Workflow

### When I Start Work
I'll say: "Let's check what tasks Tyler assigned me"

You should run:
```bash
gh issue list --assignee toby --label "toby-task"
```

### When I Pick a Task
I'll say: "Let's work on issue #5"

You should:
1. First run: `gh issue view 5`
2. Show me the issue
3. Follow the EXACT instructions in the issue
4. Make ONLY the changes specified

### When I Want to Test on My iPhone
When I say ANY of these:
- "rebuild and reinstall on my phone"
- "let's test this on my phone"
- "xcode mode"
- "install on my iphone"

You should IMMEDIATELY run this EXACT sequence:
```bash
# Build and sync
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
npm run build && npx cap sync ios

# Clean old builds
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

# Build for my iPhone (you know my device ID)
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=[MY_DEVICE_ID]' \
  -allowProvisioningUpdates build 2>&1 | tail -5

# Install and launch
xcrun devicectl device install app --device [MY_DEVICE_ID] \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device [MY_DEVICE_ID] com.artrio.artrio
```

Don't ask if I want to build - just do it when I use those phrases!

### When Testing is Done
I'll say: "It works! Let's commit this"

You should:
```bash
git add -A
git commit -m "Fix: [issue title from the GitHub issue] (#[issue number])"
git push origin main
gh issue close [issue number] --comment "Completed and tested on iPhone!"
```

## IMPORTANT RULES FOR YOU, CLAUDE

### ALWAYS:
- Follow the GitHub issue instructions EXACTLY
- When I say "rebuild", run the full sequence automatically
- Use the exact code from the "Find" and "Replace" sections
- Run `npm run lint` after making changes
- Wait for "BUILD SUCCEEDED" before saying it worked

### NEVER:
- Change anything not mentioned in the issue
- Delete files unless the issue specifically says to
- Create new files unless the issue specifically says to
- Try to "improve" code beyond the issue scope
- Ask "do you want me to build?" - just build when I say the trigger words

## Example Conversation

**Me:** "Let's check what tasks Tyler assigned me"

**You:** *runs `gh issue list --assignee toby --label "toby-task"`*
"You have 3 tasks assigned:
- #5: Fix button color in Messages
- #6: Add loading spinner  
- #7: Update placeholder text"

**Me:** "Let's work on issue #5"

**You:** *runs `gh issue view 5` and shows me the issue*
"I'll help you complete this issue. Let me make the exact changes specified..."
*makes the changes exactly as described in the issue*

**Me:** "Great! Now rebuild and reinstall on my phone"

**You:** *immediately runs the full build sequence without asking*
"Building and installing on your iPhone now..."
*shows the build output*
"✅ App installed and launched on your iPhone!"

**Me:** "Perfect, it works! Let's commit this"

**You:** *runs the git commands*
"Committed and pushed! Issue #5 is now closed."

## My Testing Device Setup

First time only, I need to tell you my device ID:

**Me:** "Help me find my iPhone device ID"

**You:** 
```bash
xcrun devicectl list devices | grep -i iphone
```
"I found: Toby's iPhone 15 - ID: 00008140-001234567890ABCD"

**Me:** "Great, save that as my device ID"

**You:** "Perfect! I'll remember your device ID for all future builds."

## The GitHub Issue Format

Tyler's issues always have these sections:
1. **Files to Edit** - The EXACT file path
2. **Step-by-Step Instructions** - EXACTLY what to find and replace
3. **Testing Checklist** - What to verify
4. **What NOT to Do** - Important boundaries

Follow these sections like a recipe!

## Quick Reference

My common phrases and what you should do:

| I say | You do |
|-------|--------|
| "Let's check my tasks" | `gh issue list --assignee toby --label "toby-task"` |
| "Work on issue #X" | `gh issue view X` then make changes |
| "rebuild and reinstall" | Run full Xcode build sequence |
| "it works!" | Commit and close the issue |
| "something's wrong" | Show me the error and help fix it |
| "undo that" | `git reset --hard HEAD` |

Remember: We're a team! Tyler finds bugs, assigns them to me, and you help me fix them exactly as specified. No more, no less!