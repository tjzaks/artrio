# Critical Understanding: How Dropbox Works for Claude

## For Toby's Claude (and Tyler's Claude)

You need to understand how Dropbox actually works on our Macs:

## What Dropbox IS and ISN'T

### What Dropbox IS:
- **A sync service** that keeps a LOCAL folder on each Mac synchronized
- **LOCAL FILES** on Toby's Mac at `/Users/toby/Library/CloudStorage/Dropbox/artrio/`
- **LOCAL FILES** on Tyler's Mac at `/Users/tyler/Library/CloudStorage/Dropbox/artrio/`
- **The Dropbox app** running in the background, syncing these LOCAL folders

### What Dropbox ISN'T:
- NOT a remote server you connect to
- NOT something you (Claude) need to access
- NOT cloud storage you download from

## How It Actually Works

```
Tyler's Mac                          Toby's Mac
-----------                          ----------
/Users/tyler/.../Dropbox/artrio/    /Users/toby/.../Dropbox/artrio/
    (LOCAL FOLDER)                       (LOCAL FOLDER)
         ↓                                    ↓
    Dropbox App                         Dropbox App
    (background)                        (background)
         ↓                                    ↓
    ←────────── Syncs via Internet ──────────→
```

## What This Means for You (Claude)

### You're Just Editing LOCAL Files!

When you run:
```bash
cd /Users/toby/Library/CloudStorage/Dropbox/artrio/
edit src/pages/Home.tsx
```

You're editing a **LOCAL file on Toby's Mac**.

The Dropbox app (which Toby has installed) then:
1. Detects the file changed
2. Uploads the change to Dropbox servers
3. Tyler's Dropbox app downloads the change
4. Tyler's LOCAL file updates automatically

### You Don't Need Dropbox Access!

You (Claude) NEVER need to:
- Connect to Dropbox
- Use Dropbox API
- Download from Dropbox
- Upload to Dropbox

You ONLY need to:
- Edit LOCAL files at `/Users/toby/Library/CloudStorage/Dropbox/artrio/`
- Let Toby's Dropbox app handle the syncing

## The Complete Picture

1. **Toby's Mac has Dropbox app installed** ✓
2. **Dropbox app syncs a LOCAL folder** ✓
3. **You edit that LOCAL folder** ✓
4. **Dropbox app syncs changes to Tyler** ✓
5. **Tyler's Dropbox app updates his LOCAL folder** ✓

## Practical Example

When Tyler says (via git commit): "TOBY_CLAUDE: Edit Home.tsx"

What happens:
```bash
# You (Claude) do this:
cd /Users/toby/Library/CloudStorage/Dropbox/artrio/
vim src/pages/Home.tsx  # Edit the LOCAL file
# File saved locally

# Dropbox app automatically does this (you don't see it):
# - Detects Home.tsx changed
# - Syncs to cloud
# - Tyler's Dropbox downloads it
# - Tyler's local Home.tsx updates
```

## Key Commands That Work

These work because they access LOCAL files:
```bash
# Navigate to LOCAL Dropbox folder
cd /Users/toby/Library/CloudStorage/Dropbox/artrio/

# Edit LOCAL files
edit src/pages/Messages.tsx

# Read LOCAL files  
cat package.json

# Build from LOCAL files
npm run build

# Git operations on LOCAL repo
git status
git add -A
git commit -m "Fixed issue"
```

## What You Should NEVER Try

```bash
# ❌ Don't try to "sync Dropbox"
dropbox sync  # NOT A THING

# ❌ Don't try to "download from Dropbox"
curl https://dropbox.com/...  # NO NEED

# ❌ Don't worry about Dropbox at all
# Just work with LOCAL files!
```

## The Mental Model

Think of it like this:
1. You're a chef in Toby's kitchen (local Mac)
2. You cook with ingredients from the fridge (local files)
3. A magic fridge (Dropbox app) keeps Tyler's fridge synced
4. When you add salt to the soup, Tyler's soup gets salt too
5. You don't need to understand the magic, just cook!

## Summary for Claude

- **Path:** `/Users/toby/Library/CloudStorage/Dropbox/artrio/` = LOCAL FOLDER
- **Your job:** Edit these LOCAL files normally
- **Dropbox's job:** Sync changes to Tyler (happens automatically)
- **What you access:** LOCAL FILES ONLY
- **What syncs them:** The Dropbox app Toby has installed

You're just editing regular files on Toby's Mac. Dropbox handles the magic of keeping them synced with Tyler's Mac. That's it!