#!/bin/bash

# 🧹 Artrio Quick Cleanup Script
# Run this to remove obvious technical debt

echo "🚀 Starting Artrio Cleanup..."

# 1. Delete obvious dead files
echo "❌ Removing dead files..."
rm -f src/pages/Messages.old.tsx
rm -f src/components/HealthCheck.tsx
rm -f src/components/ProfileSkeleton.tsx
rm -f src/components/IOSLoader.tsx

# 2. Remove all SIMULATOR DEBUG console logs
echo "🔇 Removing debug console.logs..."
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' '/SIMULATOR DEBUG/d'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' '/📱 iOS SIMULATOR DEBUG/d'

# 3. Organize SQL files
echo "📁 Organizing SQL files..."
mkdir -p _archive/applied_sql/2025-01-22
mv ADD_MESSAGE_EDITING.sql _archive/applied_sql/2025-01-22/ 2>/dev/null
mv ADD_READ_AT_COLUMN*.sql _archive/applied_sql/2025-01-22/ 2>/dev/null
mv APPLY_TO_PRODUCTION.sql _archive/applied_sql/2025-01-22/ 2>/dev/null
mv DEBUG_*.sql _archive/applied_sql/2025-01-22/ 2>/dev/null
mv DIAGNOSTIC_CHECK.sql _archive/applied_sql/2025-01-22/ 2>/dev/null
mv EMERGENCY_CLEANUP.sql _archive/applied_sql/2025-01-22/ 2>/dev/null
mv QUICK_FIX.sql _archive/applied_sql/2025-01-22/ 2>/dev/null
mv URGENT_*.sql _archive/applied_sql/2025-01-22/ 2>/dev/null

# 4. Clean up archive
echo "🗑️  Cleaning archive..."
rm -rf _archive/js_debug_scripts/
rm -rf _archive/temp_scripts/*.js
rm -rf _archive/temp_scripts/*.cjs
rm -rf _archive/temp_scripts/*.mjs

# 5. Count remaining issues
echo ""
echo "📊 Remaining Technical Debt:"
echo "Console.logs left: $(grep -r "console.log" src/ | wc -l)"
echo "SQL files in root: $(ls *.sql 2>/dev/null | wc -l)"
echo "Story creators: $(ls src/components/*Story*.tsx 2>/dev/null | wc -l)"
echo "Gallery components: $(ls src/components/*Gallery*.tsx 2>/dev/null | wc -l)"

echo ""
echo "✅ Quick cleanup complete!"
echo ""
echo "⚠️  Still TODO:"
echo "1. Consolidate 5 story creators into 1"
echo "2. Consolidate 4 gallery components into 1"
echo "3. Split Messages.tsx (1200+ lines!)"
echo "4. Remove remaining console.logs"
echo ""
echo "Run 'git status' to see changes"