# Lovable + New GitHub Repo Sync Instructions

## Important Change!
The Artrio project has been moved from `tobyszaks/artrio` to `tjzaks/artrio` for Railway deployment.

## For Your Brother (Toby) - Updating Lovable

### Option 1: Continue with Lovable (Recommended)
1. Keep working in Lovable as normal
2. Lovable will push to `tobyszaks/artrio`
3. You'll manually sync changes to Tyler's repo

### Option 2: Connect Lovable to New Repo
1. In Lovable project settings
2. Change GitHub connection to `tjzaks/artrio`
3. You'll need Tyler to grant access

### Option 3: Manual Sync Process
Your brother continues with his repo, and you sync:

```bash
# Add both repos as remotes
git remote add toby https://github.com/tobyszaks/artrio.git
git remote add tyler https://github.com/tjzaks/artrio.git

# Pull from Toby's (Lovable)
git pull toby main

# Push to Tyler's (Railway)
git push tyler main
```

## Automated Sync Script

Create this script to sync between repos:

```bash
#!/bin/bash
# sync-repos.sh

echo "Syncing from Lovable to Railway repo..."

# Fetch from both
git fetch toby
git fetch tyler

# Merge Lovable changes
git checkout main
git merge toby/main -m "sync: Lovable changes from tobyszaks/artrio"

# Push to Tyler's repo for Railway
git push tyler main

echo "Sync complete! Railway will auto-deploy."
```

## Current Setup

### Two Repos Now Exist:
1. **`tobyszaks/artrio`** - Original (Lovable pushes here)
2. **`tjzaks/artrio`** - New (Railway deploys from here)

### Your Worktrees:
All worktrees now point to `tjzaks/artrio`:
- `/Users/tyler/artrio` → main branch
- `/Users/tyler/artrio-worktrees/frontend` → dev-frontend
- `/Users/tyler/artrio-worktrees/backend` → dev-backend
- `/Users/tyler/artrio-worktrees/mobile` → dev-mobile

## Quick Sync Commands

### For Tyler (You):
```bash
# Add Toby's repo as upstream
cd /Users/tyler/artrio
git remote add toby https://github.com/tobyszaks/artrio.git

# Sync Lovable changes
git fetch toby
git merge toby/main
git push origin main  # Pushes to your repo for Railway
```

### For Toby (Your Brother):
```bash
# Option A: Clone Tyler's repo instead
git clone https://github.com/tjzaks/artrio
cd artrio

# Option B: Add Tyler's as remote
git remote add tyler https://github.com/tjzaks/artrio.git
git push tyler main  # Push his changes to Tyler's
```

## Collaboration Workflow

### If Toby Keeps Using Lovable with His Repo:
1. Lovable → pushes to → `tobyszaks/artrio`
2. Tyler syncs → pulls from `tobyszaks` → pushes to `tjzaks`
3. Railway → deploys from → `tjzaks/artrio`

### If Toby Switches to Direct Git:
1. Both work on `tjzaks/artrio`
2. Railway auto-deploys from same repo
3. No syncing needed

## Railway Deployment

Now you can deploy to Railway:

1. Go to [Railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select **`tjzaks/artrio`** (YOUR repo)
4. Railway will auto-deploy from main branch

## Important Notes

- All development branches are in YOUR repo now
- Railway will deploy from YOUR repo (`tjzaks/artrio`)
- Your brother can either:
  - Keep using Lovable (you'll sync)
  - Work directly on your repo
  - Fork your repo and send PRs

## Next Steps

1. **Deploy to Railway** from `tjzaks/artrio`
2. **Decide with your brother**:
   - Keep Lovable on his repo (requires syncing)
   - Move Lovable to your repo
   - Have him work directly with git
3. **Set up sync** if needed using the script above