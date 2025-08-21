# Artrio Development Workflow

## 🏃‍♂️ Fastest Testing Options (Ranked)

### 1. **Web Browser** (Instant - 5 seconds)
```bash
npm run dev
```
- Open http://localhost:5173 in Chrome
- Use DevTools mobile view (Cmd+Opt+I, then Cmd+Shift+M)
- ✅ Instant hot reload
- ✅ Great for UI/logic changes
- ❌ Can't test native features (camera, etc)

### 2. **Safari on your iPhone** (30 seconds)
```bash
npm run dev -- --host
```
- On iPhone: Safari → http://[your-mac-ip]:5173
- ✅ Real device testing
- ✅ Hot reload works!
- ❌ No native features

### 3. **Direct Xcode Deploy** (2-3 mins when it works)
```bash
npm run build && npx cap sync ios
# Then in Xcode: Cmd+R
```
- ✅ Full native features
- ❌ Xcode is buggy and unreliable
- Use `./scripts/force-xcode-rebuild.sh` when stuck

### 4. **TestFlight** (10-15 mins)
```bash
# Archive in Xcode: Product → Archive
# Then upload to App Store Connect
```
- ✅ Most reliable
- ✅ Test on multiple devices
- ❌ Slower iteration

## 🎯 Recommended Workflow

1. **Do most development in web browser** (npm run dev)
2. **Test on Safari mobile** for touch/mobile UX
3. **Use Xcode** only when testing native features
4. **Push to TestFlight** for final testing before commits

## 🔧 When Xcode Won't Deploy

Run this magic command:
```bash
./scripts/force-xcode-rebuild.sh
```

Or just unplug/replug your iPhone (seriously works 50% of the time)