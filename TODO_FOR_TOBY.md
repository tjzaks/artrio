# 🚨 URGENT: Supabase Optimization Tasks for Toby

Hey Toby! We hit Supabase limits and upgraded to Pro. Tyler already fixed some critical issues. Here's what's done and what needs work.

## 📝 Context: What Tyler & Claude Just Fixed
1. **Messages page was scrolling weird** - Fixed with proper container heights
2. **Keyboard covered input bar** - Added Capacitor Keyboard listeners to move input up
3. **Messages started at top (oldest)** - Now scrolls to bottom (newest) on load
4. **Send button was broken with keyboard up** - Fixed z-index and touch handlers
5. **Send button was jittery** - Stabilized with fixed positioning
6. **Read receipts were killing database** - Reduced polling from 500ms to 5 seconds

## 🔥 The Supabase Problem (Why We Hit Limits)
- **Database Queries:** 500ms polling = 172,800 queries/day PER USER 😱
- **Storage:** 5MB photos × 100 views = 500MB bandwidth per photo
- **The Fix:** Optimize queries + compress images = 95% reduction

## 📋 TODO List for Toby (Step-by-Step Guide)

### 1. 🔴 CRITICAL: Add Image Compression (Saves $$$ on bandwidth)
**Why:** Every story photo is 5MB. That's insane. Instagram uses ~200KB.

**Step-by-Step Fix:**
```bash
# 1. Open the story creator file
open /Users/tyler/Library/CloudStorage/Dropbox/artrio/src/components/SnapchatStoryCreator.tsx
```

```typescript
# 2. Add this compression function after line 70 (before handlePost):

const compressImage = async (dataUrl: string): Promise<Blob> => {
  // This shrinks images from 5MB to ~200KB
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  
  const canvas = document.createElement('canvas');
  const MAX_WIDTH = 1080;  // Instagram story size
  const MAX_HEIGHT = 1920;
  
  // Calculate new dimensions
  let width = img.width;
  let height = img.height;
  
  if (width > height) {
    if (width > MAX_WIDTH) {
      height = height * (MAX_WIDTH / width);
      width = MAX_WIDTH;
    }
  } else {
    if (height > MAX_HEIGHT) {
      width = width * (MAX_HEIGHT / height);
      height = MAX_HEIGHT;
    }
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Draw and compress
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  
  // 0.85 quality = good enough, much smaller
  return new Promise(resolve => 
    canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85)
  );
};
```

```typescript
# 3. Update handlePost function (around line 75-83):

// FIND THIS:
const response = await fetch(selectedImage);
const blob = await response.blob();

// REPLACE WITH:
const blob = await compressImage(selectedImage);
```

```typescript
# 4. Do the same for these files:
- /src/components/SimpleStoryCreator.tsx
- /src/components/NativeStoryCreator.tsx  
- /src/components/InstagramStoryCreator.tsx
- /src/pages/Messages.tsx (line ~720 for photo sending)
```

**How to Test:**
1. Take a photo in the app
2. Go to Supabase dashboard → Storage → stories bucket
3. Check file size - should be <500KB not 5MB

### 2. 🟡 Fix the Messages Query Nightmare
**Why:** Loading conversations does 20+ separate database queries. That's dumb.

**The Problem Code (`/src/pages/Messages.tsx` line ~88):**
```typescript
// BAD: This does N+1 queries
for (const conv of conversations) {
  const profile = await getProfile(conv.user_id);  // Query 1
  const lastMsg = await getLastMessage(conv.id);   // Query 2  
  const unread = await getUnreadCount(conv.id);    // Query 3
}
```

**The Fix - One Query to Rule Them All:**
```typescript
// GOOD: One query with joins (put this in loadConversations function)
const { data: convs } = await supabase
  .from('conversations')
  .select(`
    *,
    user1:profiles!conversations_user1_id_fkey(
      user_id,
      username,
      avatar_url
    ),
    user2:profiles!conversations_user2_id_fkey(
      user_id,
      username,
      avatar_url
    ),
    messages(
      content,
      created_at,
      is_read,
      sender_id
    )
  `)
  .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
  .order('created_at', { 
    foreignTable: 'messages', 
    ascending: false 
  })
  .limit(1, { foreignTable: 'messages' });

// Then process the joined data
const processed = convs?.map(conv => {
  const otherUser = conv.user1_id === user?.id ? conv.user2 : conv.user1;
  const lastMessage = conv.messages?.[0];
  
  return {
    ...conv,
    otherUser,
    last_message: lastMessage?.content,
    last_message_at: lastMessage?.created_at,
    unread_count: conv.messages?.filter(m => 
      !m.is_read && m.sender_id !== user?.id
    ).length || 0
  };
});
```

**How to Test:**
1. Open browser DevTools → Network tab
2. Navigate to Messages
3. Count the supabase requests - should be 1-2, not 20+

### 3. 🟢 Remove Duplicate Realtime Subscriptions
**Why:** We have 12+ WebSocket connections. Each one costs money.

**Find and Delete These Duplicate Subscriptions:**
```typescript
// In Messages.tsx around line 293-346
// DELETE the conversation-specific subscription
// We already have 'all-messages-unified' that handles everything

// REMOVE THIS ENTIRE BLOCK:
const channel = supabase
  .channel(`conversation-${selectedConversation.id}`)
  .on(/* ... */)
  .subscribe();
```

## 🐛 Known Issues Still To Fix

### High Priority Issues:
1. **Push Notifications** - Not implemented yet (Tyler has a plan)
2. **Trio Formation at Scale** - Current algorithm is O(n²), will break at 1000+ users
3. **Message Search** - No search functionality 
4. **Block/Report Users** - No moderation tools
5. **Image Loading** - No lazy loading or CDN caching

### Medium Priority Issues:
1. **Offline Support** - App breaks without internet
2. **Message Pagination** - Loads ALL messages (will break with 1000+ messages)
3. **Typing Indicators** - No way to see if someone is typing
4. **Message Reactions** - No emoji reactions on messages
5. **Voice Messages** - Feature request from users

### Low Priority (But Annoying):
1. **Dark Mode** - Inconsistent dark mode support
2. **Animations** - Some transitions are janky
3. **Error Messages** - Generic "Something went wrong" everywhere
4. **Loading States** - No skeletons, just spinners
5. **Empty States** - Blank screens when no data

## 🧪 Quick Supabase Testing Commands

```bash
# Check current database size
# Go to: Supabase Dashboard → Settings → Billing → Current Usage

# Monitor real-time connections
# Go to: Supabase Dashboard → Realtime → Active Connections

# See slow queries
# Go to: Supabase Dashboard → Database → Query Performance
```

## 🚀 Deployment After Changes
```bash
# Toby's deployment flow:
git add -A
git commit -m "feat: Add image compression and optimize queries"
git push origin main

# Railway auto-deploys in 2-3 minutes
# Check: https://artrio.up.railway.app
```

## 💡 Pro Tips for Supabase Haters
- **Think of it as Postgres + Firebase had a baby**
- **RLS policies = Row Level Security = "who can see what"**
- **Realtime = WebSockets = "live updates without polling"**
- **Edge Functions = Serverless = "backend code without servers"**
- **Storage = S3 clone = "where photos live"**

## 🆘 If You Get Stuck
1. Check Tyler's recent commits for context
2. Look at Supabase error in browser console
3. The error usually says exactly what's wrong (unlike Firebase)
4. Most issues are RLS policies blocking access

## 📊 How We'll Know It's Working
- **Before:** 172,800 queries/day/user
- **After:** ~5,000 queries/day/user (97% reduction)
- **Before:** 5MB per photo upload  
- **After:** 200KB per photo upload (96% reduction)
- **Before:** 12+ WebSocket connections
- **After:** 2-3 connections (75% reduction)

Good luck! The app is close to being scalable. These fixes will get us there. 🚀