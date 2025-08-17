# Artrio Project Orchestrator Guide

## Git Worktree Setup Complete ✅

Three parallel development branches have been created for your Claude team:

### Claude Instance Setup

**Claude 1 - Dummy Accounts Developer**
- Working Directory: `/Users/tyler/Library/CloudStorage/Dropbox/artrio-claude1`
- Branch: `claude1`
- Focus: Creating 10 dummy high school student accounts (5 male, 5 female)
- Instructions: CLAUDE_1_INSTRUCTIONS.md

**Claude 2 - TestFlight Engineer**
- Working Directory: `/Users/tyler/Library/CloudStorage/Dropbox/artrio-claude2`
- Branch: `claude2`
- Focus: Preparing app for TestFlight beta testing
- Instructions: CLAUDE_2_INSTRUCTIONS.md

**Claude 3 - QA Engineer**
- Working Directory: `/Users/tyler/Library/CloudStorage/Dropbox/artrio-claude3`
- Branch: `claude3`
- Focus: Integration testing and quality assurance
- Instructions: CLAUDE_3_INSTRUCTIONS.md

## How to Share with Each Claude

For each Claude instance, share the following:

### For Claude 1:
```
"You are Claude 1, working on the Artrio project. Your working directory is /Users/tyler/Library/CloudStorage/Dropbox/artrio-claude1 and you're on branch claude1. Please read CLAUDE_1_INSTRUCTIONS.md in your directory for your tasks. Focus on creating 10 dummy high school student accounts."
```

### For Claude 2:
```
"You are Claude 2, working on the Artrio project. Your working directory is /Users/tyler/Library/CloudStorage/Dropbox/artrio-claude2 and you're on branch claude2. Please read CLAUDE_2_INSTRUCTIONS.md in your directory for your tasks. Focus on TestFlight beta preparation."
```

### For Claude 3:
```
"You are Claude 3, working on the Artrio project. Your working directory is /Users/tyler/Library/CloudStorage/Dropbox/artrio-claude3 and you're on branch claude3. Please read CLAUDE_3_INSTRUCTIONS.md in your directory for your tasks. Focus on integration testing and QA."
```

## Orchestration Workflow

### Phase 1: Parallel Development (Current)
- All 3 Claudes work simultaneously on their tasks
- Each commits to their own branch
- No merge conflicts during this phase

### Phase 2: Integration (After individual tasks complete)
1. Claude 1 completes dummy accounts
2. Claude 2 prepares TestFlight build
3. Claude 3 begins integration testing

### Phase 3: Merge & Release
1. Review all branches
2. Merge claude1 → main
3. Merge claude2 → main
4. Merge claude3 → main
5. Final testing on main branch
6. Submit to TestFlight

## Progress Tracking

### Priority 1: Dummy Accounts ⏳
- Owner: Claude 1
- Status: In Progress
- 10 accounts: 5 male, 5 female high schoolers
- Deliverable: dummy_accounts.json & seed script

### Priority 2: TestFlight Prep ⏳
- Owner: Claude 2
- Status: In Progress
- Configure build settings
- Prepare beta testing groups
- Deliverable: Beta-ready build configuration

### Quality Assurance ⏳
- Owner: Claude 3
- Status: Waiting for Claude 1 & 2
- Test all dummy accounts
- Verify TestFlight build
- Deliverable: QA sign-off

## Monitoring Commands

Check progress of each Claude:
```bash
# Check Claude 1's work
cd ~/Library/CloudStorage/Dropbox/artrio-claude1
git status
git log --oneline -5

# Check Claude 2's work
cd ~/Library/CloudStorage/Dropbox/artrio-claude2
git status
git log --oneline -5

# Check Claude 3's work
cd ~/Library/CloudStorage/Dropbox/artrio-claude3
git status
git log --oneline -5
```

View all branches:
```bash
cd ~/Library/CloudStorage/Dropbox/artrio
git branch -a
git worktree list
```

## Communication Protocol

Each Claude should:
1. Commit frequently with clear messages
2. Create status updates in their branch
3. Flag any blockers immediately
4. Coordinate through you when integration is needed

## Success Criteria

✅ Beta release ready when:
- All 10 dummy accounts created and tested
- TestFlight build configured and validated
- Zero critical bugs
- All integration tests passing
- QA sign-off complete

## Next Steps

1. Share the specific instructions with each Claude
2. Monitor their progress using the commands above
3. Coordinate any cross-team dependencies
4. Review and merge branches when ready
5. Submit to TestFlight!

---
*Last Updated: August 17, 2025*
*Orchestrator: Tyler's Main Claude*