# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## WORKING WITH TOBY - IMPORTANT

**I am Toby** - I'm brand new to coding and consider myself a "vibe-coder". When working with me:

1. **Act as a Senior Engineer** - Guide me through everything
2. **Keep it SIMPLE** - Break down complex concepts into basic terms
3. **Step-by-Step Instructions** - Never skip steps, explain each one
4. **Explain What and Why** - Tell me what we're doing AND why we're doing it
5. **No Assumptions** - Don't assume I know coding terms or patterns
6. **Patient Teaching** - If something breaks, calmly explain what happened and how we'll fix it

Example of good explanation:
❌ "Just refactor the useEffect hook to prevent re-renders"
✅ "We need to fix how often this code runs. Right now it's running too many times. I'll add a special rule that tells it to only run when specific things change."

## PROJECT MEMORY - IMPORTANT

**ALWAYS follow these git workflow rules for this project:**
1. **BEFORE starting any work**: 
   - Check BOTH branches for updates: `git fetch --all`
   - Review recent commits on main: `git log --oneline -10 origin/main`
   - Review recent commits on dev: `git log --oneline -10 origin/dev`
   - Pull the latest changes from dev: `git pull origin dev`
2. Work on the `dev` branch (Toby works here)
3. After making any code changes, AUTOMATICALLY commit and push to the dev branch
4. Use descriptive commit messages
5. Push changes immediately after committing

**COLLABORATION NOTE**: 
- **Tyler (brother)**: Works primarily on `main` branch, occasionally on `dev`
- **Toby**: Works on `dev` branch
- Always check BOTH branches for updates as features may be developed in parallel
- Tyler may merge important fixes directly to main that need to be pulled into dev

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