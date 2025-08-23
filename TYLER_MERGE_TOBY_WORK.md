# Tyler's Quick Commands for Managing Toby's Work

## Check What Toby Has Done
```bash
# See closed issues
gh issue list --assignee toby --state closed --limit 5

# See what's on dev branch
git fetch origin dev
git log origin/dev --oneline -5

# See diff between dev and main
git diff main..origin/dev --stat
```

## Merge Toby's Work to Main
```bash
# Quick merge (if everything looks good)
git checkout main
git pull origin main
git merge origin/dev
git push origin main

# Or cherry-pick specific commits
git cherry-pick [commit-hash]
git push origin main
```

## Create New Tasks for Toby

### Quick Method
When you find something simple while coding:
```bash
# Just tell Claude: "Tell Toby to fix this"
# Claude creates the issue automatically
```

### Manual Method
```bash
gh issue create --title "[TOBY] Fix [thing]" \
  --assignee toby \
  --label "toby-task,easy,ui-only" \
  --body "Files to Edit: /src/pages/[file]
  
Find this exact code:
\`\`\`
[current code]
\`\`\`

Replace with:
\`\`\`
[new code]
\`\`\`"
```

## Monitor Toby's Progress
```bash
# Active tasks
gh issue list --assignee toby --state open

# Today's completed work
gh issue list --assignee toby --state closed --search "closed:>$(date -v-1d +%Y-%m-%d)"

# See his actual commits
git log origin/dev --author="toby" --oneline -10
```

## The Workflow

1. **You find issue** → "Tell Toby"
2. **Toby fixes on dev** → Tests on iPhone → Pushes to dev
3. **You review** → `git diff main..origin/dev`
4. **You merge** → `git merge origin/dev && git push`
5. **Goes live** → Railway auto-deploys from main

This keeps main stable while Toby learns!