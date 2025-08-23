# 🚀 Artrio Team Workflow - Quick Reference

## The Complete Flow

```
Tyler (main branch)          Toby (dev branch)
       │                           │
       ├─ Finds bug ──────────────►│
       │                           │
       ├─ "Tell Toby" ────────────►│
       │                           │
   Claude creates                  │
   GitHub issue ──────────────────►├─ Gets notification
                                   │
                                   ├─ "Let's work on #5"
                                   │
                                Claude reads issue
                                Makes exact changes
                                   │
                                   ├─ "Rebuild on my phone"
                                   │
                                Claude builds & installs
                                   │
                                   ├─ Tests on iPhone
                                   │
                                   ├─ "It works, commit"
                                   │
                                Pushes to dev branch
                                   │
       │◄──────────────────────────┤
       │                           │
   Reviews changes                 │
   git diff main..dev              │
       │                           │
   Merges to main                  │
       │                           │
   Railway auto-deploys            │
       ▼                           ▼
```

## Quick Commands

### Tyler's Commands
```bash
# Create task for Toby
"Tell Toby to fix [this thing]"

# Check Toby's work
git diff main..origin/dev

# Merge Toby's fixes
git merge origin/dev && git push

# See Toby's progress
gh issue list --assignee toby
```

### Toby's Commands (to his Claude)
```bash
"Let's start work"          # Setup dev branch
"What are my tasks?"        # List issues
"Work on issue 5"           # Start task
"Rebuild on my phone"       # Test on iPhone
"It works, commit it"       # Push to dev
```

## The Rules

### Tyler (Senior Engineer)
- Works on `main` branch
- Finds bugs, creates issues
- Reviews and merges from `dev`
- Handles complex features

### Toby (Junior Developer)  
- Works on `dev` branch only
- Fixes exactly what issues say
- Tests on real iPhone
- Pushes to dev for review

### Claude (AI Assistants)
- Tyler's Claude: Creates detailed issues, manages workflow
- Toby's Claude: Follows issues exactly, auto-builds for iPhone

## File Structure
```
/Users/tyler/Library/CloudStorage/Dropbox/artrio/
├── src/
│   ├── pages/         # Page components
│   ├── components/    # Reusable components
│   └── hooks/         # Custom React hooks
├── ios/App/          # Xcode project
└── docs/             # Documentation
```

## Success Metrics
- ✅ Issues completed = progress made
- ✅ All tests pass before commits
- ✅ Dev branch stays clean
- ✅ Main branch stays stable
- ✅ Tyler focuses on hard problems
- ✅ Toby learns by doing safe tasks

## The Magic
1. **No manual Xcode** - Claude auto-builds
2. **No confusion** - Exact instructions
3. **No breaking prod** - Dev branch safety
4. **Real device testing** - iPhone verification
5. **Clear ownership** - Tyler leads, Toby executes