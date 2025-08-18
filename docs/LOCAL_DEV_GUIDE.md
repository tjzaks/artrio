# 🚀 ARTRIO LOCAL DEVELOPMENT

## Quick Start (30 seconds)
```bash
# Start local Supabase
supabase start

# Use local environment
cp .env.local .env

# Start dev server
npm run dev

# Setup users & trios
node setup_local.js
```

## Local Credentials
- **URL**: http://localhost:8080
- **Admin**: tyler / test123
- **Users**: jonnyb, emma, jake / test123

## Supabase Studio
- **URL**: http://localhost:54323
- **Login**: No auth needed (local)
- **Database**: Direct access to all tables

## Testing
```bash
# Run all tests
node test_exhaustive.js

# Check database
supabase db dump
```

## Common Tasks

### Reset Everything
```bash
supabase db reset
node setup_local.js
```

### Add New User
```bash
# In Supabase Studio, or:
node -e "/* create user code */"
```

### Deploy to Production
```bash
# Switch back to production
cp .env.production .env
git add -A && git commit -m "your message"
git push
```

## Key Benefits of Local Dev
1. **Instant changes** - No deploy wait
2. **Full database control** - Direct SQL access
3. **Free testing** - No cloud costs
4. **Offline work** - No internet needed
5. **Fast iteration** - Change, test, repeat

## Troubleshooting

### Port conflicts
```bash
lsof -i :54321  # Check what's using port
supabase stop   # Stop local instance
supabase start  # Restart
```

### Database issues
```bash
supabase db reset  # Nuclear option
```

### Can't login
- Check .env points to local (127.0.0.1:54321)
- Run setup_local.js again
- Clear browser localStorage