# Training Claude to Follow the Workflow

## Toby: Run This Training Sequence With Claude

Copy and paste each section to train Claude on the new workflow:

---

## Training Message 1: Establishing the Git-First Habit

Claude, from now on, you need to ALWAYS check git before doing anything. Let's practice.

When I say "let's start", you should ALWAYS run:
```bash
cd ~/artrio
git checkout dev
git fetch origin
git pull origin main
git pull origin dev
gh issue list --assignee toby --label "toby-task" --state open
```

Let's try it now. I'm going to say "let's start" and you should run those commands immediately.

Ready? Let's start.

---

## Training Message 2: Tyler Sync Reflex

Claude, whenever I mention Tyler's name with any action word (pushed, updated, fixed, changed), you MUST immediately sync with main branch and rebuild. No exceptions.

For example, if I say "Tyler pushed a fix", you should IMMEDIATELY (without asking) run:
```bash
cd ~/artrio
git fetch origin
git pull origin main
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

Let me test this. Tyler just pushed an update. 

(You should be running the sync commands right now)

---

## Training Message 3: Issue Workflow

Claude, when I say "work on issue X", you must:
1. FIRST check git for latest: `git pull origin main`
2. THEN view the issue: `gh issue view X`
3. Follow the instructions EXACTLY as written
4. Only change what the issue specifies

Let's practice. Work on issue 5.

(You should pull from git first, then show me the issue)

---

## Training Message 4: Build Reflex

Claude, when I say ANY of these words: "rebuild", "test", "install", "xcode", you should IMMEDIATELY run the full build sequence without asking.

The words "rebuild", "test on phone", or "install" are commands, not questions. Execute immediately.

Let's test: rebuild

(You should be building right now)

---

## Training Message 5: The New Rules

Claude, here are your new permanent rules:

1. **Git First Rule**: ALWAYS pull from main before starting any work
2. **Tyler Rule**: Tyler's name + action word = immediate sync and rebuild
3. **No Questions Rule**: Never ask "should I rebuild?", just do it
4. **Exact Changes Rule**: Only change what issues specify, nothing more
5. **Dev Branch Rule**: Always work on dev, never on main

Confirm you understand these rules by showing me my current tasks.

---

## Training Message 6: Daily Routine

Claude, every day when I start, even if I don't say "let's start", you should:
1. Check if we're on dev branch
2. Pull Tyler's latest changes from main
3. Show me my assigned tasks
4. Rebuild the app on my phone

This should be automatic. From now on, when I say anything like "hello", "good morning", "ready to work", or "what's up", run the full startup sequence.

Let's test. Good morning!

---

## Training Message 7: Breaking Old Habits

Claude, you might have old habits from before. Here's what's different now:

OLD WAY: Wait for me to tell you what to do
NEW WAY: Automatically sync with git when I mention Tyler

OLD WAY: Ask if you should rebuild
NEW WAY: Just rebuild when I say the trigger words

OLD WAY: Try to be helpful by improving code
NEW WAY: Only make the EXACT changes specified in issues

OLD WAY: Work directly on files
NEW WAY: Always pull from git first, every time

Let's make sure you've got it. Tyler fixed the login bug.

(You should be syncing and rebuilding automatically)

---

## Final Test Sequence

Toby, after training Claude with the messages above, run this final test:

1. Say: "Tyler pushed updates"
   - Claude should pull and rebuild automatically
   
2. Say: "What are my tasks?"
   - Claude should list GitHub issues
   
3. Say: "Work on issue 5"
   - Claude should pull first, then show issue
   
4. Say: "Rebuild"
   - Claude should build immediately
   
5. Say: "Commit this"
   - Claude should commit to dev branch

If Claude does all these automatically without asking questions, the training is complete!

---

## Reinforcement Phrases

Use these phrases regularly to reinforce the behavior:

- "Remember to check git first"
- "Tyler might have pushed changes, better sync"
- "Let's make sure we have Tyler's latest"
- "You know the drill - Tyler pushed means rebuild"
- "Follow the issue exactly, no improvements"

## If Claude Forgets

If Claude reverts to old habits, remind it:

"Claude, remember the new workflow: Tyler's name means sync immediately. Rebuild means build now. No questions, just action. Let's try again."