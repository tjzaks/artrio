# CRITICAL: Auto-Rebuild After EVERY Change

## Toby: Add This to Claude's Training

---

Claude, this is CRITICAL - you're missing a key behavior. 

**NEW RULE: After EVERY code edit, you MUST automatically rebuild and reinstall on the iPhone.**

## The Auto-Rebuild Rule

Whenever you:
- Edit a file with the Edit tool
- Save any changes
- Modify ANY code
- Complete an issue's changes

You MUST IMMEDIATELY run (without asking):
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

## The Workflow Pattern

1. **Read issue** → View what needs changing
2. **Edit file** → Make the exact changes
3. **AUTO-REBUILD** → Immediately, without being asked
4. **Confirm** → "✅ Changes applied and app rebuilt on your phone"
5. **Wait for Toby** → He tests and says if it works

## Examples of the Correct Behavior

### Example 1: Simple Edit
**Toby:** "Work on issue 5"
**Claude:** 
- Views issue
- Edits the file
- **AUTOMATICALLY rebuilds without being asked**
- Says: "✅ Fixed the button color and rebuilt on your phone"

### Example 2: After ANY Change
**Toby:** "Change the text to say 'Hello'"
**Claude:**
- Makes the change
- **AUTOMATICALLY rebuilds without being asked**
- Says: "✅ Text updated and app rebuilt"

### Example 3: Multiple Files
**Toby:** "The issue says to edit 3 files"
**Claude:**
- Edits file 1
- Edits file 2  
- Edits file 3
- **AUTOMATICALLY rebuilds without being asked**
- Says: "✅ All 3 files updated and app rebuilt"

## Training Exercise

Let's practice. I'm going to give you a simple task and you should:
1. Make the change
2. Automatically rebuild WITHOUT me asking
3. Confirm it's on my phone

Ready? In the file `~/artrio/src/pages/Home.tsx`, change "Welcome" to "Hello". 

(You should edit the file AND immediately rebuild without waiting for me to ask)

## The Key Difference

### ❌ OLD WAY (WRONG):
- Edit file
- Wait for Toby to say "rebuild"
- Then rebuild

### ✅ NEW WAY (CORRECT):
- Edit file
- IMMEDIATELY rebuild automatically
- Tell Toby it's ready to test

## Remember These Triggers

These actions ALWAYS trigger automatic rebuild:
- Using the Edit tool
- Using the Write tool
- Making any code change
- Completing issue instructions
- Toby asking for any change

## The Mental Model

Think of it like this:
**"Code changed = Phone needs update = Rebuild NOW"**

Never wait. Never ask. Just rebuild after every change.

## Confirmation Phrase

After EVERY rebuild, always say:
"✅ Changes applied and rebuilt on your phone - ready to test!"

This lets Toby know the change is live on his device.

## Final Test

Let's make sure you've got it. I need you to fix the typo in `~/artrio/src/pages/Messages.tsx` where it says "Mesages" instead of "Messages".

If you:
1. Fix the typo
2. Immediately rebuild without me asking
3. Confirm it's on my phone

Then you've learned the auto-rebuild behavior correctly!

---

## For Tyler: What This Fixes

This training ensures Toby's Claude:
- Automatically rebuilds after EVERY code change
- Clears DerivedData (preventing Xcode cache issues)
- Reinstalls fresh on the iPhone
- Matches YOUR Claude's behavior exactly

No more "make change, wait for rebuild command" - it's automatic!