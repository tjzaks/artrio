# Fix Supabase Email Confirmation Issue

## The Problem
When users sign up, they get an email but the confirmation link doesn't work because it's pointing to the wrong URL.

## Quick Fix #1: Update Supabase Dashboard (REQUIRED)

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project** (wojakjbyqclydhcgtvga)
3. **Go to Authentication → URL Configuration**
4. **Add these URLs to "Redirect URLs"**:
   ```
   https://artrio-production.up.railway.app
   https://artrio-production.up.railway.app/*
   http://localhost:8080
   http://localhost:5173
   com.szakacsmedia.artrio://
   capacitor://localhost
   ```

5. **Update Site URL**:
   - Set to: `https://artrio-production.up.railway.app`

6. **Save changes**

## Quick Fix #2: Disable Email Confirmation (For Testing)

If you want to test immediately without email confirmation:

1. **Supabase Dashboard → Authentication → Providers → Email**
2. **Turn OFF** "Confirm email"
3. Users can now sign up and login immediately without confirmation

## Quick Fix #3: For Mobile App (TestFlight)

The mobile app needs special handling for deep links:

1. **In Supabase Dashboard → Authentication → URL Configuration**
2. **Add this to Redirect URLs**:
   ```
   com.szakacsmedia.artrio://auth-callback
   ```

3. **Update the code** (already done):
   - The redirect URL now points to Railway production URL
   - This works for both web and mobile

## Testing the Fix

### Test on Web (Railway):
1. Go to: https://artrio-production.up.railway.app
2. Sign up with a new email
3. Check email and click confirmation link
4. Should redirect back to the app

### Test on Mobile (TestFlight):
1. Open app on iPhone
2. Sign up with email
3. Email link will open Safari
4. Safari redirects back to app

## Alternative: Magic Link Login (No Password)

Instead of email/password, you can use magic links:

```typescript
// In your auth code:
const { error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: 'https://artrio-production.up.railway.app'
  }
})
```

## Environment Variables to Add (Railway)

Add this to Railway environment variables:
```
VITE_APP_URL=https://artrio-production.up.railway.app
```

## Current Status

- [x] Code updated to use production URL
- [ ] Supabase Dashboard URLs need updating
- [ ] Test email confirmation flow
- [ ] Deploy fix to Railway

## Next Steps

1. **UPDATE SUPABASE DASHBOARD NOW** (see Quick Fix #1)
2. Push code changes to deploy
3. Test signup flow

The main issue is that Supabase doesn't know about your Railway URL. Once you add it to the Redirect URLs in Supabase dashboard, the email links will work!