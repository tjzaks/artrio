# Artrio Development Workflow

## Branch Structure

- **`main`** - Production branch (deployed to Railway + Supabase Cloud)
- **`dev`** - Development branch (local Supabase + local development)

## Environment Setup

### Local Development (Recommended)
```bash
# 1. Switch to dev branch
git checkout dev

# 2. Start local Supabase
npm run supabase:start

# 3. Set up local database with test data
npm run db:setup

# 4. Start development server with local environment
npm run dev:local
```

### Production Testing
```bash
# Test against production Supabase (use with caution!)
npm run dev:prod
```

## Environment Files

- **`.env.local`** - Local development (Supabase running on localhost:54321)
- **`.env.production`** - Production environment (Supabase cloud)
- **`.env`** - Active environment (copied from .local or .production)

## NPM Scripts

### Development
- `npm run dev:local` - Start with local Supabase
- `npm run dev:prod` - Start with production Supabase
- `npm run dev` - Start with current .env (default)

### Database Management
- `npm run supabase:start` - Start local Supabase containers
- `npm run supabase:stop` - Stop local Supabase
- `npm run supabase:studio` - Open Supabase Studio (localhost:54323)
- `npm run db:setup` - Initialize local database with schema + test data
- `npm run db:reset` - Reset and recreate local database

### Build & Deploy
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Local Services

When `supabase start` is running:

- **App**: http://localhost:8080
- **Supabase API**: http://127.0.0.1:54321
- **Supabase Studio**: http://127.0.0.1:54323
- **Email Inbox** (Inbucket): http://127.0.0.1:54324
- **PostgreSQL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Test Accounts

The local database includes these test accounts (password: `password123`):

- `dev@artrio.local` - Developer account
- `tyler@szakacsmedia.com` - Admin account  
- `alice@test.com` - Test user
- `bob@test.com` - Test user

## Development Workflow

### Working on Features

1. **Start Local Environment**
   ```bash
   git checkout dev
   npm run supabase:start
   npm run dev:local
   ```

2. **Make Changes**
   - Edit code in `/src`
   - Test locally with hot reload
   - Use test accounts for authentication

3. **Database Changes**
   - Modify schema in `supabase/migrations/`
   - Run `npm run db:reset` to apply changes
   - Or manually apply via Supabase Studio

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin dev
   ```

### Deploying to Production

1. **Test Locally First**
   ```bash
   npm run build
   npm run lint
   ```

2. **Merge to Main**
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

3. **Railway Auto-Deploy**
   - Railway automatically deploys main branch
   - Monitor at https://artrio.up.railway.app

## Database Schema Management

### Local Development
- Schema files in `supabase/migrations/`
- Run `npm run db:setup` to apply all migrations
- Use Supabase Studio for manual changes

### Production
- Production database is managed separately
- Schema changes should be tested locally first
- Apply to production via Supabase dashboard

## Troubleshooting

### Local Supabase Issues
```bash
# Stop and restart everything
npm run supabase:stop
npm run supabase:start
npm run db:setup
```

### Environment Issues
```bash
# Check active environment
cat .env

# Switch to local development
npm run dev:local

# Reset database
npm run db:reset
```

### Port Conflicts
If ports are in use, stop other services or modify `supabase/config.toml`

## Key Differences: Local vs Production

| Aspect | Local Development | Production |
|--------|------------------|------------|
| Supabase URL | http://127.0.0.1:54321 | https://siqmwgeriobtlnkxfeas.supabase.co |
| Database | Local PostgreSQL | Supabase Cloud |
| Auth | Local auth system | Supabase Auth |
| Storage | Local storage | Supabase Storage |
| Email | Inbucket (localhost:54324) | Real email delivery |
| Data | Test accounts | Production users |

## Best Practices

1. **Always use local development** for new features
2. **Test with multiple test accounts** before production
3. **Use Supabase Studio** for database inspection
4. **Keep migrations in sync** between local and production
5. **Never commit sensitive data** (use .env files)
6. **Use meaningful commit messages** with conventional format

## Emergency Procedures

### Reset Everything Local
```bash
npm run supabase:stop
docker system prune -f
npm run supabase:start
npm run db:setup
npm run dev:local
```

### Production Issues
1. Check Railway deployment logs
2. Verify Supabase cloud status
3. Test locally to reproduce
4. Deploy fix via main branch

---

**Need Help?** Check the individual service docs:
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Railway Deployment](https://docs.railway.app/)
- [Vite Development](https://vitejs.dev/guide/)