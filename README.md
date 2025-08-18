# Artrio - Social Trio Platform

A social media platform that connects people in groups of three (trios) for meaningful conversations and connections.

## 🚀 Latest Updates (August 18, 2025)

### ✨ New Features
- **Instagram-Style Stories**: 24-hour ephemeral content with text overlays
- **Friends System**: Add friends, manage requests, see suggestions from past trios  
- **Direct Messaging**: Secure DMs with spam protection (1 message limit until response)
- **Mobile Support**: Full mobile browser compatibility with camera access
- **Admin Dashboard**: Complete admin controls for user and content management

### 🔧 Major Fixes
- Fixed trio randomization and display
- Resolved authentication issues with messaging
- Created all missing storage buckets
- Fixed database schema inconsistencies
- Cleaned up ~70 dead files (35% reduction)

### 📱 Current Features
- Daily trio matching
- Real-time group chat
- Stories with reactions
- Friend connections
- Direct messaging
- Profile customization
- Admin controls
- Mobile-responsive design

## 🏃 Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop
- npm or yarn

### Local Development

1. **Clone and install:**
```bash
git clone https://github.com/tjzaks/artrio.git
cd artrio
git checkout dev
npm install
```

2. **Start Supabase locally:**
```bash
npx supabase start
```

3. **Run development server:**
```bash
npm run dev:local
```

4. **Access the app:**
- Desktop: http://localhost:8080
- Mobile: http://[YOUR-IP]:8080

### Test Accounts
```
Admin: admin@artrio.local / password123
User: test@artrio.local / password123
```

## 📂 Project Structure

```
artrio/
├── src/
│   ├── components/       # React components
│   │   ├── Stories.tsx   # Story display
│   │   ├── SimpleStoryCreator.tsx # Story upload
│   │   └── admin/        # Admin panels
│   ├── pages/           # Route pages
│   │   ├── Home.tsx     # Main trio view
│   │   ├── Messages.tsx # DM system
│   │   └── Friends.tsx  # Friend management
│   └── contexts/        # React contexts
├── supabase/
│   ├── migrations/      # Database migrations
│   └── seed.sql        # Test data
└── scripts/
    └── manage_admin.cjs # Admin management
```

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Mobile**: Capacitor (iOS/Android builds)
- **Deployment**: Railway/Vercel ready

## 📋 Next Steps

### High Priority
1. **Native Mobile App**
   - Build with Capacitor for full camera roll access
   - Push notifications
   - Offline support

2. **Enhanced Stories**
   - Video support
   - Story highlights/archives
   - Music/audio overlays

3. **Trio Features**
   - Group video calls
   - Shared calendars
   - Trio challenges/games

### Medium Priority
4. **Discovery**
   - Explore page
   - Hashtags
   - Location-based matching

5. **Moderation**
   - AI content filtering
   - Report system improvements
   - Admin analytics dashboard

6. **Performance**
   - Image optimization
   - Lazy loading
   - Caching strategies

### Future Features
7. **Monetization**
   - Premium subscriptions
   - Virtual gifts
   - Business accounts

8. **Advanced Social**
   - Events creation
   - Communities/groups
   - Live streaming

## 🐛 Known Issues

1. **Browser Limitations**
   - Cannot auto-populate camera roll (use file picker instead)
   - Web push notifications require HTTPS

2. **Local Development**
   - Must update IP addresses for mobile testing
   - Supabase auth requires consistent URLs

3. **Pending Fixes**
   - Story video playback on iOS Safari
   - Message read receipts
   - Typing indicators

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Database Schema

### Core Tables
- `profiles` - User profiles and settings
- `trios` - Daily trio groupings
- `posts` - Trio feed posts
- `friendships` - Friend connections
- `stories` - 24-hour stories
- `conversations` - DM threads
- `messages` - Individual messages

### Storage Buckets
- `avatars` - Profile pictures (5MB)
- `stories` - Story media (50MB)
- `post-media` - Feed media (50MB)
- `messages` - DM attachments (50MB)

## 🔐 Environment Variables

Create `.env.local`:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
```

## 📱 Mobile Development

### Build for iOS/Android:
```bash
npm run build
npx cap sync
npx cap open ios  # or android
```

### Testing on Physical Device:
1. Update `.env.local` with your machine's IP
2. Ensure phone is on same WiFi
3. Access via `http://[YOUR-IP]:8080`

## 🚢 Deployment

### Railway
```bash
railway up
```

### Vercel
```bash
vercel --prod
```

### Docker
```bash
docker build -t artrio .
docker run -p 8080:8080 artrio
```

## 📄 License

Private repository - All rights reserved

## 👥 Team

- **Tyler** - Project Owner
- **Tyler's Brother** - Lead Developer
- **Contributors** - Welcome!

## 📞 Support

For issues or questions:
1. Check existing [GitHub Issues](https://github.com/tjzaks/artrio/issues)
2. Create new issue with detailed description
3. Include browser console logs and screenshots

---

**Last Updated:** August 18, 2025
**Version:** 1.0.0-dev
**Status:** Active Development