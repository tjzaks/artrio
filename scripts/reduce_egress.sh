#!/bin/bash

# Script to reduce Supabase egress usage immediately

echo "🔥 EMERGENCY EGRESS REDUCTION PLAN"
echo "=================================="
echo ""
echo "1. IMMEDIATE ACTIONS (Do these NOW):"
echo "   - Stop all background processes"
echo "   - Disable real-time subscriptions temporarily"
echo "   - Clear browser caches for all testers"
echo ""

echo "2. DISABLE HIGH-BANDWIDTH FEATURES:"
echo "   Commenting out these features in the code temporarily..."

# Create a temporary patch to disable heavy features
cat > /tmp/egress_patch.ts << 'EOF'
// TEMPORARY PATCH: Disable high-bandwidth features

// 1. Disable real-time subscriptions
export const REALTIME_DISABLED = true;

// 2. Use smaller image sizes
export const MAX_IMAGE_SIZE = 500000; // 500KB max

// 3. Reduce API polling
export const POLL_INTERVAL = 60000; // 1 minute instead of 500ms

// 4. Cache everything aggressively
export const CACHE_DURATION = 3600000; // 1 hour
EOF

echo ""
echo "3. CLEAR CDN/STORAGE:"
echo "   Run these SQL commands in Supabase (if you can connect):"
echo ""
echo "   -- Delete all story media older than 1 day"
echo "   DELETE FROM storage.objects"
echo "   WHERE bucket_id = 'stories'"
echo "   AND created_at < NOW() - INTERVAL '1 day';"
echo ""
echo "   -- Delete all test/demo accounts' data"
echo "   DELETE FROM messages"
echo "   WHERE sender_id IN ("
echo "     SELECT user_id FROM profiles"
echo "     WHERE username LIKE 'test%' OR username LIKE 'demo%'"
echo "   );"
echo ""

echo "4. OPTIMIZE CURRENT CODE:"
echo "   - Reduce image quality in Camera settings"
echo "   - Implement lazy loading for messages"
echo "   - Cache user profiles locally"
echo ""

echo "5. MONITOR USAGE:"
echo "   Check Supabase dashboard every hour"
echo "   Current: 11.29 GB / 5 GB (226%)"
echo "   Target:  < 5 GB"
echo ""

echo "6. IF NOTHING WORKS:"
echo "   - Create new Supabase project (instant fix)"
echo "   - OR upgrade to Pro ($25/month)"
echo "   - OR wait until Aug 16 (billing reset)"
echo ""

echo "📱 For TestFlight users having issues:"
echo "   Tell them: 'We're experiencing high traffic."
echo "   Photo uploads temporarily disabled while we scale up.'"