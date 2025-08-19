# Supabase Authentication Settings

## Important: Update these settings in your Supabase Dashboard

### 1. Password Reset Redirect URL
Go to: **Authentication → URL Configuration**

Add these URLs to **Redirect URLs**:
- `https://artrio.up.railway.app/reset-password`
- `https://artrio.up.railway.app/auth` (for OAuth if needed)
- `http://localhost:8080/reset-password` (for local development)
- `http://localhost:8080/auth` (for local development)

### 2. Site URL
In **Authentication → URL Configuration**:
- Set **Site URL** to: `https://artrio.up.railway.app`

### 3. Email Templates
Go to: **Authentication → Email Templates → Reset Password**

Make sure the email template uses the correct URL:
```
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### 4. SMTP Settings (Optional)
If you want better email delivery:
- Go to **Authentication → SMTP Settings**
- Configure with your own SMTP provider (SendGrid, Mailgun, etc.)

## Current Settings in Code:
- Production URL: `https://artrio.up.railway.app`
- Password Reset Path: `/reset-password`
- Environment Variable: `VITE_APP_URL`

## Testing Password Reset:
1. Click "Forgot Password" on login page
2. Enter your email
3. Check your email (including spam folder)
4. Click the reset link
5. Enter new password on reset page