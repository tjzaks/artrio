# Artrio Setup Guide

## Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account (free tier works)

## Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/artrio.git
cd artrio
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy your Project URL and anon key to `.env`
4. Run the database migrations:
   ```bash
   # Go to SQL Editor in Supabase Dashboard
   # Run each file in database/migrations/ in order
   ```

### 4. Run Development Server
```bash
npm run dev
# Open http://localhost:5173
```

## Building for Production

### Web Deployment
```bash
npm run build
# Deploy dist/ folder to your hosting service
```

### iOS App (TestFlight)
```bash
npm run build
npx cap sync ios
# Open in Xcode and archive for App Store Connect
```

## Project Structure
```
artrio/
├── src/              # React source code
├── database/         # SQL migrations and seeds
├── docs/            # Documentation
├── scripts/         # Utility scripts
├── ios/             # iOS app (Capacitor)
└── public/          # Static assets
```

## Common Issues

### Blank screen on load
- Check browser console for errors
- Verify .env has correct Supabase URL
- Ensure Supabase project is running

### Authentication not working
- Verify Supabase Auth is enabled
- Check email templates in Supabase Dashboard
- Ensure redirect URLs are configured

### iOS build fails
- Run `npx cap sync ios` after any changes
- Check Xcode for provisioning profile
- Increment build number for each upload

## Support
- GitHub Issues: [github.com/yourusername/artrio/issues](https://github.com/yourusername/artrio/issues)
- Production: [artrio.up.railway.app](https://artrio.up.railway.app)
