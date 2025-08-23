# Tyler → Toby's Claude Communication Protocol

## How Tyler Communicates with Toby's Claude

### Method 1: Through GitHub Issues (Primary)
When Tyler finds a bug:
```bash
gh issue create --title "[TOBY] Fix [specific thing]" \
  --assignee toby \
  --label "toby-task" \
  --body "Instructions for Claude: [exact steps]"
```

Toby's Claude sees this when Toby says "check tasks" and executes automatically.

### Method 2: Through Commit Messages (Updates)
When Tyler pushes changes that affect Toby's work:
```bash
git commit -m "fix: [what I fixed] 

TOBY_CLAUDE: Pull this immediately and rebuild. This fixes [issue]."
git push origin main
```

Toby's Claude should check commit messages when pulling.

### Method 3: Through Instruction Files (Complex Tasks)
For complex instructions:
```bash
# Create a file with Claude instructions
echo "Claude, execute these steps:
1. Pull from main
2. Edit src/pages/Messages.tsx line 45
3. Change 'Hello' to 'Hi'
4. Rebuild and test
5. Commit with message 'Fix: Updated greeting text'" > CLAUDE_TASK_001.md

git add CLAUDE_TASK_001.md
git commit -m "task: Instructions for Claude in CLAUDE_TASK_001.md"
git push origin main
```

### Method 4: Through Branch Names (Urgent)
For urgent tasks:
```bash
git checkout -b toby-urgent-fix-login-bug
git push origin toby-urgent-fix-login-bug
# This signals Claude to check for a new branch with instructions
```

## What Toby's Claude Should Do

### On Every Sync
```bash
# Check for Tyler's messages
git log origin/main --oneline -5 | grep -i "TOBY_CLAUDE"
# Check for instruction files
ls CLAUDE_TASK_*.md 2>/dev/null
# Check for new branches
git branch -r | grep toby-
```

### Auto-Execute Tyler's Instructions
If commit message contains "TOBY_CLAUDE:", execute the instructions immediately.
If CLAUDE_TASK_*.md exists, read and execute it.
If new toby-* branch exists, check it for instructions.

## Tyler's Commands to Toby's Claude

### Direct Commands (in commits or issues)
- `TOBY_CLAUDE: Rebuild and test` → Auto rebuild
- `TOBY_CLAUDE: Fix [file]:[line]` → Edit specific location
- `TOBY_CLAUDE: Run tests` → Execute test suite
- `TOBY_CLAUDE: Commit current work` → Save progress

### Status Requests
- `TOBY_CLAUDE: Report status` → Toby's Claude creates STATUS.md
- `TOBY_CLAUDE: List completed tasks` → Check closed issues
- `TOBY_CLAUDE: Show current diff` → git diff > CURRENT_WORK.md

## Minimize Toby Involvement

### Claude Should Handle:
- ✅ All git operations
- ✅ All builds and installs
- ✅ All file edits
- ✅ All issue management
- ✅ All troubleshooting

### Only Need Toby For:
- ❓ Testing on physical device (looking at screen)
- ❓ Confirming visual changes look correct
- ❓ Plugging in iPhone if disconnected
- ❓ Saying "it works" or "it's broken"

## Example Flow

1. **Tyler finds bug**
   ```bash
   gh issue create --title "[TOBY] Fix button color" \
     --body "Claude: Edit src/Button.tsx line 10, change 'gray' to 'blue'. Auto-rebuild and close when done."
   ```

2. **Toby's minimal involvement**
   - Toby: "Check tasks"
   - Claude: [does everything automatically]
   - Toby: "Looks good" or "Still broken"

3. **Tyler gets update**
   ```bash
   # See closed issue with Claude's commit
   gh issue view [number]
   git log origin/dev --oneline -5
   ```

## The Ideal Workflow

```
Tyler → GitHub Issue → Toby's Claude reads → Auto-executes → Commits to dev
         ↑                                                           ↓
         └─────────────── Tyler reviews and merges ←────────────────┘
```

Toby just:
1. Starts Claude
2. Says "check tasks" 
3. Tests on phone
4. Says "works" or "broken"

Everything else is automated!