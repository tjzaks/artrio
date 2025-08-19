# 🚀 TestFlight Quick Deploy - Artrio

## Right Now (While Waiting for Developer Account):

### 1. Check if iOS Project Exists
```bash
cd ~/Library/CloudStorage/Dropbox/artrio
ls -la ios/
```

If no iOS folder, create it:
```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync
```

### 2. Open in Xcode
```bash
npx cap open ios
```

## Once Developer Account is Active (1-4 hours):

### STEP 1: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - App Name: Artrio
   - Language: English
   - Bundle ID: com.szakacsmedia.artrio
   - SKU: ARTRIO001

### STEP 2: Configure Xcode (5 minutes)
In Xcode with your project open:

1. **Click "App" in sidebar**
2. **Signing & Capabilities tab:**
   - Team: [Your Apple Developer Name]
   - Bundle ID: com.szakacsmedia.artrio
   - ✅ Automatically manage signing

3. **Build Settings:**
   - Version: 1.0.0
   - Build: 1

### STEP 3: Archive & Upload (10 minutes)

1. **Select Target Device:**
   - Top bar: App > Any iOS Device (arm64)

2. **Archive:**
   - Menu: Product → Archive
   - Wait for build to complete (3-5 mins)

3. **Upload to App Store Connect:**
   - Organizer window opens automatically
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Click "Upload"
   - Use defaults for all options
   - Click "Upload"

### STEP 4: TestFlight Setup (5 minutes)

1. **Go to App Store Connect**
2. **Select your app → TestFlight tab**
3. **Wait for "Processing" to complete** (5-30 mins)
4. **Once ready:**
   - Click the build
   - Add "Test Details"
   - What to test: "Test login and trio creation"

### STEP 5: Add Testers

**Internal Testing (Immediate):**
- TestFlight → Internal Testing → "+" 
- Add your email
- They get invite immediately

**External Testing (Needs Review - 24hrs):**
- TestFlight → External Testing
- Create group "Beta Testers"
- Add emails
- Submit for review

## Common Issues & Fixes:

### "No Team" Error
- Xcode → Preferences → Accounts
- Add your Apple ID
- Download certificates

### "Bundle ID Taken"
- Change to: com.[yourname].artrio

### Build Fails
```bash
# Clean and rebuild
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData
pod install
```

### Archive Option Grayed Out
- Select "Any iOS Device" not simulator
- Check scheme is "Release" not "Debug"

## Testing Locally Without TestFlight:

### Run on Your iPhone (No TestFlight Needed!)
1. Connect iPhone via USB
2. In Xcode: Select your phone from device list
3. Click Play button ▶️
4. Trust developer on phone: Settings → General → Device Management

This lets you test immediately while waiting for:
- Developer account activation (1-4 hrs)
- TestFlight processing (30 mins)
- External review (24 hrs)

## Current Dummy Users for Testing:
- jake.thompson.artrio@test.com
- emma.johnson.artrio@test.com  
- Password: ArtrioTest2025!

---

**Start with:** Connect your iPhone and run directly from Xcode - you can test RIGHT NOW even without developer account fully active!