# Railway Deployment Guide - Artrio + Lovable Integration

## How Lovable + Git Worktrees + Railway Work Together

### The Development Flow:
```
Lovable (Toby's UI) → GitHub main branch → Railway (auto-deploy)
                            ↓
                    Your local worktrees 
                    (pull updates to stay in sync)
```

## Coordination with Lovable

### For Your Brother (Using Lovable):
1. He makes changes in Lovable UI at https://lovable.dev/projects/5616f9cd-575b-4981-842e-64a5c8e9b8c9
2. Lovable automatically commits to the `main` branch
3. Railway auto-deploys from `main` (if configured)

### For You & Your Claudes (Using Git Worktrees):
1. **Before starting work**, always sync with Lovable's changes:
   ```bash
   cd /Users/tyler/artrio
   git pull origin main
   
   # Then merge main into your dev branches
   cd /Users/tyler/artrio-worktrees/frontend
   git merge main
   ```

2. **Push your changes** to dev branches:
   ```bash
   git push origin dev-frontend
   ```

3. **When ready to deploy**, merge into main:
   ```bash
   cd /Users/tyler/artrio
   git merge dev-frontend dev-backend dev-mobile
   git push origin main  # This triggers Railway deployment
   ```

## Railway Setup Instructions

### Step 1: Connect Repository to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `tobyszaks/artrio`
5. Select the `main` branch for automatic deployments

### Step 2: Configure Environment Variables

In Railway dashboard, add these environment variables:

```env
# Required - Get from Supabase dashboard
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ[your-anon-key]

# Optional
PORT=3000
NODE_ENV=production
```

### Step 3: Deploy Settings

Railway should auto-detect the configuration, but verify:

- **Build Command**: `npm run build`
- **Start Command**: `npx serve dist -s -l $PORT`
- **Root Directory**: `/` (leave as default)
- **Watch Paths**: Leave default (watches all files)

### Step 4: Domain Setup

1. Railway provides a default domain: `[project-name].up.railway.app`
2. Or add a custom domain in Settings → Domains

## Deployment Triggers

### Automatic Deploys (from main branch):
- When Lovable pushes changes
- When you merge dev branches to main
- When your brother pushes directly to main

### Manual Deploys:
```bash
# From your main branch
cd /Users/tyler/artrio
git push origin main

# Or use Railway CLI
railway up
```

## Important Coordination Rules

### To Avoid Conflicts:

1. **Morning Sync Protocol**:
   ```bash
   # Every morning, all team members should:
   git fetch --all
   git pull origin main
   git merge main  # into your working branch
   ```

2. **Before Major Changes**:
   - Check if your brother is working in Lovable
   - Communicate in your team chat
   - Pull latest changes first

3. **Deployment Windows**:
   - Agree on deployment times
   - Don't deploy during active Lovable sessions
   - Test locally before pushing to main

## Monitoring Deployments

### Railway Dashboard Shows:
- Build logs
- Deploy status
- Application logs
- Resource usage
- Domain status

### Check Deployment Status:
```bash
# Using Railway CLI
railway login
railway link  # link to your project
railway status
railway logs
```

## Rollback if Needed

If a deployment breaks:

1. **In Railway Dashboard**:
   - Go to Deployments tab
   - Click on a previous successful deployment
   - Click "Redeploy"

2. **Via Git**:
   ```bash
   git revert HEAD
   git push origin main
   ```

## Branch Protection (Optional but Recommended)

To prevent accidental pushes to main:

1. Go to GitHub repo settings
2. Add branch protection rule for `main`
3. Require pull request reviews
4. This makes Lovable create PRs instead of direct pushes

## Troubleshooting

### Build Fails on Railway:
- Check build logs in Railway dashboard
- Verify all environment variables are set
- Ensure `npm run build` works locally
- Check for missing dependencies

### Lovable Changes Not Deploying:
- Verify Lovable is pushing to `main` branch
- Check Railway is watching `main` branch
- Look for failed builds in Railway

### Merge Conflicts:
```bash
# If you have conflicts with Lovable's changes
git pull origin main
# Resolve conflicts in VS Code
git add .
git commit -m "resolve: merge conflicts with Lovable changes"
git push
```

## Daily Workflow

### Morning (All Team Members):
1. Check Railway dashboard for overnight deploys
2. Pull latest from main
3. Merge main into your working branch
4. Start development

### Before Major Features:
1. Coordinate with your brother
2. Ensure Lovable changes are committed
3. Pull and test latest main
4. Develop in your branch

### Deployment Time:
1. Ensure all tests pass locally
2. Merge to main
3. Monitor Railway deployment
4. Test production site

## Quick Commands Reference

```bash
# Check deployment
railway status

# View logs
railway logs

# Open production site
railway open

# Redeploy
railway up

# Link to project (first time)
railway link
```

## Support Contacts

- **Lovable Issues**: Check Lovable dashboard or their support
- **Railway Issues**: Railway dashboard → Support
- **Git Conflicts**: Coordinate with team
- **Urgent**: Message your brother directly

---

**Current Status**: Ready for Railway deployment
**Auto-deploy Branch**: main
**Lovable Integration**: Active
**Next Step**: Connect repository to Railway