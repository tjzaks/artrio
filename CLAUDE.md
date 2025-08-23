# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## WORKING WITH TOBY - IMPORTANT

**I am Toby** - I am a COMPLETE NOVICE at coding. Zero technical experience. I'm a "vibe-coder" who makes decisions based on how things look. When working with me:

1. **Act as a Senior Engineer** - Guide me through EVERYTHING, assume ZERO knowledge
2. **Keep it SIMPLE** - Use everyday language, avoid ALL technical jargon
3. **Step-by-Step Instructions** - Like teaching a child, never skip ANY step
4. **Explain What and Why** - Tell me what we're doing AND why in plain English
5. **No Assumptions** - I don't know what npm, git, components, or ANY coding terms mean
6. **Patient Teaching** - When something breaks, explain it like I'm five years old

**MY ROLE vs YOUR ROLE:**
- **Toby (Me)**: I look at the UI/front-end and make decisions based on what I see visually
- **Claude (You)**: You handle ALL the technical problem-solving:
  - Think critically about challenges
  - Identify and debug issues proactively
  - Solve coding problems without waiting for me to spot them
  - Anticipate potential bugs before they happen
  - Take ownership of the technical implementation

Example of good explanation:
❌ "Just refactor the useEffect hook to prevent re-renders"
✅ "We need to fix how often this code runs. Right now it's running too many times. I'll add a special rule that tells it to only run when specific things change."

## PROJECT MEMORY - IMPORTANT

**ALWAYS follow these git workflow rules for this project:**
1. **CONTINUOUSLY SYNC LOCAL FILES** (Keep Toby's computer up-to-date):
   - At the START of EVERY session: Full sync check
   - PERIODICALLY during work: Check for Tyler's updates (every 10-15 mins)
   - Check BOTH branches for updates: `git fetch --all`
   - Review recent commits on main: `git log --oneline -10 origin/main`
   - Review recent commits on dev: `git log --oneline -10 origin/dev`
   - Pull ALL changes immediately: 
     - `git pull origin dev` (always)
     - If Tyler made changes to main that affect dev, merge them:
       - `git merge origin/main` (if needed)
   - VERIFY files are synced: Check that local files match GitHub
2. Work on the `dev` branch (Toby works here)
3. After making any code changes, AUTOMATICALLY commit and push to the dev branch
4. **COMMIT MESSAGES FOR TYLER** - Structure commits to help Tyler understand:
   ```
   [Brief title of what we did]
   
   What we were trying to accomplish:
   - [Goal 1]
   - [Goal 2]
   
   What we fixed:
   - ✅ [Fixed issue 1]
   - ✅ [Fixed issue 2]
   
   Challenges/bugs discovered:
   - 🐛 [Bug we found]
   - ⚠️ [Issue that needs attention]
   
   Still needs fixing:
   - ❌ [Unresolved issue 1]
   - ❌ [Unresolved issue 2]
   
   Files changed: [List key files]
   Testing: [How to test the changes]
   ```
5. Push changes immediately after committing

**COLLABORATION NOTE**: 
- **Tyler (brother)**: Works primarily on `main` branch, occasionally on `dev`
- **Toby**: Works on `dev` branch
- Always check BOTH branches for updates as features may be developed in parallel
- Tyler may merge important fixes directly to main that need to be pulled into dev

**KEEPING TOBY'S FILES IN SYNC** (CRITICAL):
- **PROACTIVE SYNCING**: Don't wait for Toby to ask - automatically pull Tyler's changes
- **REGULAR CHECKS**: Every 10-15 minutes during work sessions, silently check for updates
- **MERGE STRATEGY**: If Tyler updates main with important fixes:
  1. Pull latest dev: `git pull origin dev`
  2. Fetch all: `git fetch --all`
  3. If main has critical updates: `git merge origin/main`
  4. Resolve any conflicts (explain simply to Toby what's happening)
  5. Push merged changes: `git push origin dev`
- **NOTIFY TOBY**: When pulling Tyler's changes, say something like:
  "Hey, I just grabbed Tyler's latest updates - you now have [describe what changed in simple terms]"

**TOBY'S "CHECK GIT" COMMAND**:
When Toby says "check git" or "check the latest":
1. Review the ENTIRE artrio repo for any changes
2. Act accordingly on what I find (pull updates, resolve conflicts, etc.)
3. Tell Toby in simple terms what I discovered

**CONTINUOUS GIT WORKFLOW CHECK**:
Everytime we do something, check Tyler's git workflow to see if he added anything new. This ensures we never miss important updates or instructions Tyler has added to the project.

This is a standing instruction for all work in this repository.

## Project Overview

Artrio is a social media app that connects people in groups of three (trios) for 24-hour collaborative storytelling experiences. Built with React, TypeScript, Vite, and Supabase.

## Development Commands

### Core Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server (localhost:5173)
npm run dev:local    # Use local env configuration
npm run dev:prod     # Use production env configuration
npm run build        # Build for production
npm run preview      # Preview production build
npm run start        # Serve production build (Railway deployment)
npm run lint         # Run ESLint
```

### Database & Supabase
```bash
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run supabase:reset   # Reset local database
npm run supabase:studio  # Open Supabase Studio UI
npm run db:setup         # Setup local database
npm run db:reset         # Reset and setup database
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS + CSS-in-JS animations (Framer Motion)
- **State Management**: React Query (TanStack Query) + React Context
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Mobile**: Capacitor for iOS/Android deployment
- **Deployment**: Railway (production)

### Key Directories
- `src/components/` - React components organized by feature
  - `ui/` - shadcn/ui base components
  - `admin/` - Admin dashboard components
  - `messaging/` - Chat and messaging features
  - `stories/` - Story creation and viewing
  - `auth/` - Authentication flows
- `src/pages/` - Route pages
- `src/hooks/` - Custom React hooks for data fetching and state
- `src/lib/` - Utilities, Supabase client, and configurations
- `src/contexts/` - React Context providers
- `supabase/` - Database migrations and configuration
- `scripts/` - Build and deployment utilities
- `docs/` - Extensive documentation for deployment and features

### Database Schema (Key Tables)
- `profiles` - User profiles with birthdays, usernames
- `trios` - Groups of three users
- `trio_members` - Junction table for trio membership
- `stories` - 24-hour ephemeral content
- `conversations` - Direct message threads
- `messages` - Individual messages
- `queue` - Users waiting for trio matching

### Environment Configuration
The project uses different `.env` files:
- `.env` - Active configuration
- `.env.local` - Local development
- `.env.production` - Production settings

Key environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_APP_URL` - Application URL

## Important Patterns

### Authentication
- Uses Supabase Auth with email/password
- Session management via React Context (`AuthContext`)
- Protected routes with `ProtectedRoute` component

### Real-time Features
- Supabase Realtime subscriptions for messages and stories
- Presence tracking for online status
- Optimistic updates with React Query

### File Uploads
- Story media stored in Supabase Storage buckets
- Profile pictures in `profile-pictures` bucket
- Story media in `story-media` bucket

### Admin Features
- Admin users identified by `is_admin` flag in profiles
- Admin dashboard at `/admin` route
- User management and content moderation tools

## Deployment Notes

### Railway Production
- Deployed at https://artrio.up.railway.app
- Uses `npm run start` command
- Serves built files from `dist/` directory
- Port configured via `$PORT` environment variable

### iOS/Android Deployment
- TestFlight for iOS beta testing
- Capacitor configuration in `capacitor.config.ts`
- Build with Xcode for iOS deployment
- See `docs/TESTFLIGHT_DEPLOYMENT_GUIDE.md` for details

## Common Tasks

### Adding a New Feature
1. Create component in appropriate directory
2. Add route if needed in `src/App.tsx`
3. Create/update Supabase tables if needed
4. Add RLS policies for security
5. Create hooks for data fetching
6. Update types in relevant `.types.ts` files

### Debugging Messages/Conversations
- Check RLS policies on messages and conversations tables
- Verify conversation participants are correctly set
- Use Supabase Studio to inspect data
- Check browser console for Supabase errors

### Testing on Mobile
1. Build the web app: `npm run build`
2. Sync with Capacitor: `npx cap sync`
3. Open in Xcode: `npx cap open ios`
4. Run on simulator or device
## Artrio Development Context Protocol

**IMPORTANT: When working on Artrio, ALWAYS ASK:**
"What's our focus - mobile app (Xcode/iOS), web (Safari mobile), or desktop (browser)?"

This context is CRITICAL because:
- **Mobile App (Xcode)**: Capacitor bridge issues, native iOS APIs, Swift/Objective-C interop, simulator vs device
- **Safari Mobile (Web)**: Mobile Safari quirks, viewport issues, touch events, iOS browser limitations
- **Desktop Browser**: Full dev tools, different viewport, mouse events, broader API support

Each platform has completely different debugging approaches, error patterns, and solutions!

## Artrio Deployment Protocol

**CRITICAL: After ANY code changes to the Artrio project:**
1. **ALWAYS commit and push to main branch immediately**
2. **Railway automatically rebuilds and deploys from main**
3. **Changes go live within 2-3 minutes**
4. **When in Xcode mode, automatically rebuild and reinstall on Tyler's iPhone**

```bash
# Standard workflow for Artrio changes:
git add -A
git commit -m "Clear description of changes"
git push origin main
# Railway auto-deploys within 2-3 minutes

# If Tyler is in Xcode mode, ALSO run this automatically:
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device 00008140-001A39900162801C com.artrio.artrio
```

### AUTO-REBUILD TRIGGER PHRASES:
- "while we're in xcode mode"
- "xcode mode"
- "testing on my phone"
- "rebuild and reinstall"

**When Tyler mentions any of these, AUTOMATICALLY rebuild and reinstall the app after making changes!**

## Xcode Build & Installation Troubleshooting Protocol

### 🚨 TRIGGER PHRASES FROM TYLER:
- "Xcode won't reinstall"
- "Build succeeded but app won't install"
- "still didn't reinstall the app"
- "it won't reinstall the app on my phone"
- "successful build, again, it didn't install"
- "ugh...investigate pls"

**WHEN YOU HEAR ANY OF THESE → IMMEDIATELY DO THIS:**

```bash
# QUICK FIX (90% success rate) - Tyler just runs these 3 commands:
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device 00008140-001A39900162801C com.artrio.artrio
```

**Tyler should see "App installed:" and "Launched application" - DONE!**

### If Tyler needs more detail or quick fix didn't work:

### DIAGNOSIS STEPS:

1. **Understand the symptoms Tyler is reporting:**
   - "Build succeeded" in Xcode but app doesn't appear on phone
   - "Won't reinstall the app" despite successful build
   - App installation seems stuck or nothing happens after build

2. **Check device connection status:**
```bash
xcrun devicectl list devices | grep -i iphone
# Expected output: Tyler's iPhone 16             00008140-001A39900162801C...available (paired)
# If no output or different device, have Tyler reconnect his iPhone
```

3. **Look for error patterns in build output:**
```bash
# Check last 20 lines of build for clues
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' build 2>&1 | tail -20

# Common errors to look for:
# - "Signing certificate is invalid" → Certificate expired
# - "duplicate interface definition" → Just warnings, not the real issue
# - "** BUILD SUCCEEDED **" but no install → Xcode not set to auto-run
```

### SOLUTION WORKFLOW:

#### Step 1: Clean everything (ALWAYS start here)
```bash
# Remove ALL DerivedData (this is where Xcode caches builds)
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

# Why: Xcode often gets confused with cached build artifacts
# This forces a completely fresh build
```

#### Step 2: Fix CocoaPods dependencies
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio/ios/App
pod deintegrate  # Removes all traces of pods from project
pod install      # Reinstalls fresh

# Why: Pod dependencies can get out of sync, especially after multiple builds
```

#### Step 3: Handle certificate issues (VERY COMMON)
```bash
# Build with automatic provisioning updates
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates build 2>&1 | tail -20

# Why: Tyler's certificates expire periodically
# The -allowProvisioningUpdates flag auto-renews them
# Watch for "Signing Identity: Apple Development: Tyler Szakacs" in output
```

#### Step 4: Manual installation (MOST RELIABLE)
```bash
# Don't rely on Xcode's auto-install - do it manually
xcrun devicectl device install app \
  --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app

# Expected output:
# "App installed:"
# "bundleID: com.artrio.artrio"
# If you see this, installation succeeded!

# Then launch the app
xcrun devicectl device process launch \
  --device 00008140-001A39900162801C \
  com.artrio.artrio

# Expected: "Launched application with com.artrio.artrio bundle identifier"
```

### UNDERSTANDING THE ROOT CAUSE:
- **Why this happens**: Xcode's "Build Succeeded" only means compilation worked, NOT that it installed
- **The real issue**: Xcode's auto-install to device is unreliable, especially after multiple builds
- **The solution**: Always use manual `xcrun devicectl` commands for guaranteed installation

### ERROR MESSAGES AND THEIR MEANINGS:
- `"Build Succeeded" but nothing happens` → Use manual install commands
- `"Signing certificate is invalid...serial number..."` → Add `-allowProvisioningUpdates`
- `"App installed:" in terminal` → Success! App is on phone
- `"No such file or directory" for DerivedData` → Already clean, proceed to build
- `"Run script build phase '[CP] Embed Pods Frameworks' will be run during every build"` → Just a warning, ignore

### COMPLETE REBUILD WORKFLOW (NUCLEAR OPTION):
```bash
# 1. Build the web assets
npm run build

# 2. Sync with iOS
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
npx cap sync ios
# Expected: "✔ update ios in X.XXs"

# 3. Clean EVERYTHING in Xcode
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
pod deintegrate && pod install
# Expected: "Pod installation complete!"

# 4. Build with certificate renewal
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=00008140-001A39900162801C' \
  -allowProvisioningUpdates clean build 2>&1 | tail -5
# Expected final line: "** BUILD SUCCEEDED **"

# 5. Install and launch (ONE COMMAND)
xcrun devicectl device install app --device 00008140-001A39900162801C \
  ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && \
xcrun devicectl device process launch --device 00008140-001A39900162801C com.artrio.artrio

# Expected output sequence:
# "01:21:54  Acquired tunnel connection to device."
# "App installed:"
# "bundleID: com.artrio.artrio"
# "Launched application with com.artrio.artrio bundle identifier"
```

### EXAMPLE OF ACTUAL SUCCESS OUTPUT:
```
01:21:54  Acquired tunnel connection to device.
01:21:54  Enabling developer disk image services.
01:21:54  Acquired usage assertion.
App installed:
• bundleID: com.artrio.artrio
• installationURL: file:///private/var/containers/Bundle/Application/[UUID]/App.app/
• launchServicesIdentifier: unknown
• databaseUUID: BBF7EC98-5DF7-487B-B151-400D727D8A5D
• databaseSequenceNumber: 2696
• options: 
01:21:56  Acquired tunnel connection to device.
01:21:56  Enabling developer disk image services.
01:21:56  Acquired usage assertion.
Launched application with com.artrio.artrio bundle identifier.
```

### QUICK DIAGNOSIS CHECKLIST:
1. Tyler says "won't install" → Start with Step 1 (Clean DerivedData)
2. See "certificate invalid" → Use `-allowProvisioningUpdates`
3. Build succeeds but no app → Skip to Step 4 (Manual install)
4. Everything fails → Use COMPLETE REBUILD WORKFLOW

## The Tyler Protocol: Systematic Engineering Approach

**ALWAYS follow this approach - no exceptions:**

### Audit → Plan → Execute → Verify

1. **AUDIT** - Document what exists, understand the current state
   - Check all file imports/dependencies
   - Document technical debt
   - Understand the mess before touching anything

2. **PLAN** - Write out exactly what we're going to do
   - Create detailed action items
   - Identify risks and dependencies
   - Document the intended outcome

3. **EXECUTE** - Do it systematically
   - Make atomic commits at each step
   - Never delete without verification
   - Keep changes focused and reversible

4. **VERIFY** - Check that nothing broke
   - Run grep for imports before deleting
   - Test the app after changes
   - Run verification scripts
   - Ensure no regressions

**Example from Tyler's actual work:**
- Created TECHNICAL_DEBT_AUDIT.md (Audit)
- Wrote SURGICAL_REFACTOR_PROMPT.md (Plan)
- Ran QUICK_CLEANUP.sh (Execute)
- Used VERIFY_REFACTOR.sh (Verify)

**This is how senior engineers work. No cowboy coding. No "delete first, ask questions later."**

## Challenge Analysis Protocol

- When I say "tackle this challenge", follow a systematic architectural audit:
  - Define the ACTUAL problem, not just symptoms
  - Map current architecture and component interactions
  - Question the existence and purpose of each component
  - Identify overlaps and conflicts between components
  - Conduct rigorous scale checks (at 10x, 100x, 1000x load)
  - Explore solution space with minimal changes
  - Assess scalability, maintainability, and potential technical debt
  - Prioritize simplicity and potential for deletion over adding complexity
  - Always evaluate solutions through the lens of potential wild success

## Delegation Protocol

- When Tyler says "delegate this", use the other Claude instances that are connected to the git worktree
- The worktrees are set up for parallel development with multiple Claude instances acting as specialized developers
- Coordinate with the team of Claude instances for complex tasks

## TestFlight Update Process

**When Tyler says "update TestFlight" or "push to TestFlight":**

1. **Bump the build number in Info.plist:**
   ```bash
   # Check current build number
   /usr/libexec/PlistBuddy -c "Print CFBundleVersion" ios/App/App/Info.plist
   
   # Increment it (e.g., from 1 to 2, from 2 to 3, etc.)
   CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" ios/App/App/Info.plist)
   NEW_BUILD=$((CURRENT_BUILD + 1))
   /usr/libexec/PlistBuddy -c "Set CFBundleVersion $NEW_BUILD" ios/App/App/Info.plist
   echo "Build number updated from $CURRENT_BUILD to $NEW_BUILD"
   ```

2. **Build and sync the iOS app:**
   ```bash
   npm run build
   npx cap sync ios
   ```

3. **Open Xcode and archive:**
   ```bash
   cd ios/App
   open App.xcworkspace
   ```

4. **In Xcode (manual steps Tyler does):**
   - Select "Any iOS Device (arm64)" as destination (top bar)
   - Menu: Product → Archive
   - Wait for archive to complete (~2-3 minutes)
   - When Organizer window opens → Click "Distribute App"
   - Choose "App Store Connect"
   - Click through defaults (Next, Next, Next)
   - Upload (takes ~2-5 minutes)

5. **After upload:**
   - Build appears in App Store Connect in ~5-15 minutes
   - TestFlight auto-distributes to existing testers
   - Testers get push notification about update

**IMPORTANT NOTES:**
- Build number MUST increment each upload (1, 2, 3, etc.)
- Version number (1.0.0) can stay the same during TestFlight
- No Apple review needed after initial TestFlight approval
- Updates are available to testers immediately after processing

## Result Verification Protocol

- Any time the results are in, cross-check Orion's answers with the verified answers found in the database/CSV files
- Analyze and identify why Orion wasn't able to correctly answer the questions
