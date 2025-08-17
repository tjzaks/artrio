# Toby's Lovable → Railway Setup Guide

## Quick Setup (Recommended)

### Step 1: Tyler adds you as collaborator
- Tyler goes to: https://github.com/tjzaks/artrio
- Settings → Manage access → Add you
- Check your email for invitation

### Step 2: Update Lovable
1. Go to your Lovable project: https://lovable.dev/projects/5616f9cd-575b-4981-842e-64a5c8e9b8c9
2. Go to Settings → GitHub Integration
3. Disconnect from `tobyszaks/artrio`
4. Connect to `tjzaks/artrio` (Tyler's repo)
5. Choose `main` branch

### Step 3: Done! 
- Your Lovable changes → Push to Tyler's repo → Auto-deploy to Railway
- Check live site: https://artrio-production.up.railway.app

## How It Works Now

```
You edit in Lovable
       ↓
Pushes to tjzaks/artrio (main branch)
       ↓
Railway auto-deploys
       ↓
Live at: artrio-production.up.railway.app
```

## Important Notes

1. **Every save in Lovable = Live on Railway** (in ~3 minutes)
2. **Check before big changes** - it goes straight to production!
3. **Tyler can see all your commits** in the repo

## If You Want Your Own Branch

Instead of pushing to `main`, you can:
1. Create branch `toby-dev` in Lovable
2. Work there safely
3. Tyler merges when ready

## Testing Your Changes

After you save in Lovable:
1. Wait 3-5 minutes
2. Check: https://artrio-production.up.railway.app
3. If broken, tell Tyler immediately

## Alternative: Keep Your Original Repo

If you prefer keeping `tobyszaks/artrio`:
- Continue using Lovable as normal
- Tyler set up auto-sync every 15 minutes
- Your changes will auto-deploy with slight delay

## Questions?
- Railway deployment status: Ask Tyler
- Lovable issues: Check Lovable dashboard
- Sync problems: Tyler can manually sync

---

**Current Status:**
- Lovable Repo: `tobyszaks/artrio` (your original)
- Deployment Repo: `tjzaks/artrio` (Tyler's)
- Live Site: https://artrio-production.up.railway.app
- Auto-sync: Every 15 minutes (if keeping separate repos)