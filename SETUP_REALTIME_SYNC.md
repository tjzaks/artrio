# Setup Real-Time Ongoing Sync Between Repos

## Option 1: GitHub Action with Repository Dispatch (BEST - Near Real-Time)

This creates an ongoing connection where Toby's pushes automatically trigger syncs to your repo.

### Step 1: Create a Personal Access Token (Tyler does this)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it: "Artrio Sync Token"
4. Select permissions:
   - `repo` (full control)
   - `workflow` (update workflows)
5. Generate and COPY THE TOKEN (you'll need it)

### Step 2: Add Token to YOUR Repo (Tyler)

1. Go to: https://github.com/tjzaks/artrio
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SYNC_TOKEN`
5. Value: [paste your token]
6. Save

### Step 3: Update the Sync Workflow

Replace the current `.github/workflows/sync-from-lovable.yml` with this enhanced version:

```yaml
name: Continuous Sync from Lovable

on:
  # Check every 2 minutes (GitHub's practical minimum for free accounts)
  schedule:
    - cron: '*/2 * * * *'
  
  # Allow manual trigger
  workflow_dispatch:
  
  # Trigger on repository dispatch (for webhooks)
  repository_dispatch:
    types: [lovable-update]

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Tyler's repo
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.SYNC_TOKEN || secrets.GITHUB_TOKEN }}
          fetch-depth: 0
      
      - name: Setup sync
        run: |
          git config user.name "Lovable Sync Bot"
          git config user.email "sync@artrio.app"
          git remote add lovable https://github.com/tobyszaks/artrio.git || true
      
      - name: Fetch and merge
        run: |
          git fetch lovable main
          
          # Check if we're behind
          BEHIND=$(git rev-list --count HEAD..lovable/main)
          
          if [ "$BEHIND" -gt 0 ]; then
            echo "📥 Found $BEHIND new commits from Lovable"
            
            # Merge with Lovable's changes taking priority
            git merge lovable/main -X theirs -m "🔄 Auto-sync: $BEHIND new commits from Lovable" || {
              # If that fails, just take their version completely
              git reset --hard lovable/main
              git push origin main --force-with-lease
              exit 0
            }
            
            git push origin main
            echo "✅ Synced successfully! Railway will deploy in ~2 minutes"
          else
            echo "✅ Already in sync"
          fi
```

### Step 4: Create Webhook in Toby's Repo (Ask Toby to do this)

1. Go to: https://github.com/tobyszaks/artrio
2. Settings → Webhooks → Add webhook
3. Payload URL: 
   ```
   https://api.github.com/repos/tjzaks/artrio/dispatches
   ```
4. Content type: `application/json`
5. Secret: Leave empty
6. SSL: Enable
7. Which events?: "Just the push event"
8. Add Authorization header:
   ```
   Authorization: token [YOUR_SYNC_TOKEN]
   ```
9. Active: ✓
10. Add webhook

## Option 2: Use GitHub App for Seamless Sync (Most Reliable)

### Use Pull App (Easiest)

1. Install Pull app: https://github.com/apps/pull
2. Configure `.github/pull.yml`:

```yaml
version: "1"
rules:
  - base: main
    upstream: tobyszaks:main
    mergeMethod: merge
    mergeUnstable: true
```

This automatically keeps your repo in sync with Toby's!

## Option 3: Local Sync Daemon (Runs on Your Mac)

Create a background process that syncs continuously:

### Setup Auto-Sync on Your Mac

1. Create sync daemon script:

```bash
#!/bin/bash
# Save as: ~/artrio-sync-daemon.sh

while true; do
  cd /Users/tyler/artrio
  
  # Fetch from Lovable
  git fetch lovable main 2>/dev/null
  
  # Check if behind
  BEHIND=$(git rev-list --count HEAD..lovable/main 2>/dev/null)
  
  if [ "$BEHIND" -gt 0 ]; then
    echo "[$(date)] Syncing $BEHIND commits from Lovable..."
    git merge lovable/main -X theirs -m "Auto-sync from Lovable" 2>/dev/null
    git push origin main 2>/dev/null
    echo "[$(date)] Sync complete!"
  fi
  
  # Wait 30 seconds before next check
  sleep 30
done
```

2. Create LaunchAgent for auto-start:

```xml
<!-- Save as: ~/Library/LaunchAgents/com.artrio.sync.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.artrio.sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/tyler/artrio-sync-daemon.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/artrio-sync.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/artrio-sync.error.log</string>
</dict>
</plist>
```

3. Start the daemon:
```bash
launchctl load ~/Library/LaunchAgents/com.artrio.sync.plist
```

## Option 4: Use Git Hooks (Simplest but Requires Toby's Setup)

Ask Toby to add this to his repo:

1. Create `.git/hooks/post-commit`:
```bash
#!/bin/bash
# Auto-push to Tyler's repo after every commit
git push https://github.com/tjzaks/artrio.git main:main --force
```

2. Make it executable:
```bash
chmod +x .git/hooks/post-commit
```

## Current Quick Solution (Do This Now)

The GitHub Action is already set up to run every 2 minutes. To make it work:

1. Your brother keeps using Lovable as normal
2. Every 2 minutes, his changes auto-sync to your repo
3. Railway auto-deploys from your repo

The sync is automatic and ongoing!

## Test The Sync

1. Ask Toby to make a small change in Lovable
2. Wait 2 minutes
3. Check your repo: https://github.com/tjzaks/artrio
4. See the auto-sync commit
5. Railway deploys automatically

## Status Dashboard

Check sync status:
- GitHub Actions: https://github.com/tjzaks/artrio/actions
- Railway Deploys: https://railway.app

The connection is now ongoing and automatic!