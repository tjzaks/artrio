# Toby's GitHub + Claude Code Workflow Guide

## Getting Started Each Day

### 1. Check Your Assigned Issues
```bash
# In Claude Code, run:
gh issue list --assignee @me --label "toby-task"
```

### 2. Pick an Issue to Work On
```bash
# View a specific issue (replace 3 with issue number)
gh issue view 3
```

### 3. Start Working on the Issue
```bash
# Comment that you're starting
gh issue comment 3 --body "Starting work on this now"
```

## Working with Claude Code

### The Magic Prompt Template
When you open an issue in Claude Code, use this prompt:

```
I need to complete GitHub issue #[NUMBER]. Here's the issue:

[PASTE THE ENTIRE ISSUE CONTENT]

Please help me complete this task exactly as specified. Follow the step-by-step instructions and run the testing checklist at the end.
```

### Example Claude Code Session

1. **You say:**
   ```
   I need to complete GitHub issue #3. Here's the issue:
   [paste issue content]
   ```

2. **Claude will:**
   - Read the exact files mentioned
   - Make the exact changes specified
   - Run the tests automatically
   - Confirm everything works

3. **When done, you say:**
   ```
   Great! Now help me close this issue and commit the changes.
   ```

## Completing Tasks

### 1. Test Everything
Before marking complete, always run:
```bash
npm run lint
npm run build
npm run dev  # Then test in browser
```

### 2. Commit Your Changes
```bash
# Claude Code will help, but the pattern is:
git add -A
git commit -m "Fix: [Issue title] (#[issue number])"
git push origin main
```

### 3. Close the Issue
```bash
# Mark it complete
gh issue close 3 --comment "Completed! All tests pass."
```

## Safety Rules

### ✅ ALWAYS DO:
- Follow the exact instructions in the issue
- Test everything before committing
- Ask Tyler if something seems wrong
- Use Claude Code to help with every step

### ❌ NEVER DO:
- Delete files (unless issue specifically says to)
- Work on issues not labeled "toby-task"
- Try to "improve" things beyond the scope
- Merge or modify other people's work

## Quick Commands Reference

```bash
# See your tasks
gh issue list --assignee @me --label "toby-task"

# View an issue
gh issue view [number]

# Comment on issue
gh issue comment [number] --body "Your message"

# Close completed issue
gh issue close [number] --comment "Done!"

# Check what changed
git status
git diff

# Common fixes
npm run lint        # Fix code style
npm run build       # Check it compiles
```

## Workflow Example

### Monday Morning:
```bash
# 1. Check what's assigned to you
gh issue list --assignee @me --label "toby-task"

# Output:
#3  [TOBY] Add loading spinner to Friends page       toby-task, easy, ui-only
#4  [TOBY] Update placeholder text in message input   toby-task, easy, ui-only
```

### Pick Issue #3:
```bash
# 2. Read the issue
gh issue view 3

# 3. Tell Claude Code:
"I need to complete GitHub issue #3. [paste issue content]"

# 4. Claude makes the changes

# 5. Test it
npm run lint
npm run build
npm run dev

# 6. Commit
git add -A
git commit -m "Fix: Add loading spinner to Friends page (#3)"
git push origin main

# 7. Close issue
gh issue close 3 --comment "Completed! Spinner working perfectly."
```

## Getting Help

### If Claude Code seems confused:
1. Say: "Let's start over. Here's the exact issue: [paste again]"
2. Or: "Please read the file first before making changes"

### If you break something:
```bash
# Undo last changes
git reset --hard HEAD

# Or ask Claude:
"I think I broke something. Can you help me reset to before my changes?"
```

### If tests fail:
```bash
# Ask Claude:
"The linter is failing with this error: [paste error]. Please fix it."
```

## Tyler's Special Notes for You

1. **Every issue is designed to be safe** - You literally cannot break the app if you follow the instructions

2. **Claude Code is your pair programmer** - Let it do the heavy lifting, you just guide it

3. **The issues get progressively harder** - Start with the "easy" ones to build confidence

4. **Railway auto-deploys** - Your changes go live in 2-3 minutes after pushing!

5. **You're learning real development** - This is exactly how professional developers work

## Your Daily Checklist

- [ ] Check assigned issues
- [ ] Pick one labeled "easy" 
- [ ] Complete it with Claude Code
- [ ] Test everything
- [ ] Commit and push
- [ ] Close the issue
- [ ] Pick the next one!

## Success Metrics

You're doing great when:
- ✅ Issues closed = tasks completed
- ✅ All tests pass before committing  
- ✅ Tyler doesn't have to fix your changes
- ✅ You're completing 2-3 issues per day

---

Remember: The instructions in each issue are EXACT. Follow them like a recipe and you'll succeed every time!