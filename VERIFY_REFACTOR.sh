#!/bin/bash

# 🔍 Artrio Refactor Verification Script
# Run this BEFORE and AFTER each refactor step to ensure nothing breaks

echo "🔍 Artrio Refactor Verification"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track issues
ISSUES=0

# 1. Check for build errors
echo -n "Checking TypeScript compilation... "
if npx tsc --noEmit 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ TypeScript errors found${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 2. Check critical imports
echo -n "Checking critical imports... "
MISSING_IMPORTS=0

# Check if Messages.tsx exists and imports are valid
if [ -f "src/pages/Messages.tsx" ]; then
    # Check for critical hooks
    if ! grep -q "usePresence" src/pages/Messages.tsx; then
        echo -e "${YELLOW}Warning: usePresence not imported in Messages.tsx${NC}"
        MISSING_IMPORTS=$((MISSING_IMPORTS + 1))
    fi
    if ! grep -q "useAuth" src/pages/Messages.tsx; then
        echo -e "${YELLOW}Warning: useAuth not imported in Messages.tsx${NC}"
        MISSING_IMPORTS=$((MISSING_IMPORTS + 1))
    fi
fi

if [ $MISSING_IMPORTS -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Check imports${NC}"
fi

# 3. Check for duplicate components
echo -n "Checking for duplicate components... "
STORY_CREATORS=$(ls src/components/*Story*.tsx 2>/dev/null | wc -l)
GALLERIES=$(ls src/components/*Gallery*.tsx 2>/dev/null | wc -l)

if [ $STORY_CREATORS -gt 1 ]; then
    echo -e "${YELLOW}Found $STORY_CREATORS story creators (should be 1)${NC}"
    ls src/components/*Story*.tsx 2>/dev/null | sed 's/^/  - /'
    ISSUES=$((ISSUES + 1))
elif [ $GALLERIES -gt 1 ]; then
    echo -e "${YELLOW}Found $GALLERIES gallery components (should be 1)${NC}"
    ls src/components/*Gallery*.tsx 2>/dev/null | sed 's/^/  - /'
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✓${NC}"
fi

# 4. Check for console.logs
echo -n "Checking for console.logs... "
CONSOLE_LOGS=$(grep -r "console.log" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ $CONSOLE_LOGS -gt 20 ]; then
    echo -e "${YELLOW}Found $CONSOLE_LOGS console.logs (high)${NC}"
    echo "  Top offenders:"
    grep -r "console.log" src/ --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort | uniq -c | sort -rn | head -3 | sed 's/^/    /'
else
    echo -e "${GREEN}✓ ($CONSOLE_LOGS logs)${NC}"
fi

# 5. Check file sizes
echo -n "Checking for oversized files... "
LARGE_FILES=0
if [ -f "src/pages/Messages.tsx" ]; then
    LINES=$(wc -l < src/pages/Messages.tsx)
    if [ $LINES -gt 500 ]; then
        echo -e "${YELLOW}Messages.tsx has $LINES lines (should be <500)${NC}"
        LARGE_FILES=$((LARGE_FILES + 1))
    fi
fi

if [ $LARGE_FILES -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
fi

# 6. Check for dead files
echo -n "Checking for known dead files... "
DEAD_FILES=0
[ -f "src/pages/Messages.old.tsx" ] && DEAD_FILES=$((DEAD_FILES + 1)) && echo -e "\n  ${RED}Messages.old.tsx still exists${NC}"
[ -f "src/components/HealthCheck.tsx" ] && DEAD_FILES=$((DEAD_FILES + 1)) && echo -e "\n  ${RED}HealthCheck.tsx still exists${NC}"
[ -f "src/components/ProfileSkeleton.tsx" ] && DEAD_FILES=$((DEAD_FILES + 1)) && echo -e "\n  ${RED}ProfileSkeleton.tsx still exists${NC}"

if [ $DEAD_FILES -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    ISSUES=$((ISSUES + 1))
fi

# 7. Check critical features still imported
echo -n "Checking critical features... "
FEATURES_OK=1

# Check if Supabase is properly imported
if ! grep -r "from '@/integrations/supabase/client'" src/ --include="*.tsx" --include="*.ts" > /dev/null; then
    echo -e "\n  ${RED}Supabase client not imported anywhere!${NC}"
    FEATURES_OK=0
fi

# Check if routing is set up
if ! grep -q "BrowserRouter\|Routes" src/App.tsx; then
    echo -e "\n  ${RED}Router not found in App.tsx!${NC}"
    FEATURES_OK=0
fi

if [ $FEATURES_OK -eq 1 ]; then
    echo -e "${GREEN}✓${NC}"
else
    ISSUES=$((ISSUES + 1))
fi

# 8. Check for SQL file organization
echo -n "Checking SQL file organization... "
ROOT_SQL=$(ls *.sql 2>/dev/null | wc -l)
if [ $ROOT_SQL -gt 5 ]; then
    echo -e "${YELLOW}$ROOT_SQL SQL files in root (should be organized)${NC}"
else
    echo -e "${GREEN}✓${NC}"
fi

# 9. Test local build
echo -n "Testing production build... "
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    
    # Check build size
    if [ -d "dist" ]; then
        SIZE=$(du -sh dist | cut -f1)
        echo "  Build size: $SIZE"
    fi
else
    echo -e "${RED}✗ Build failed!${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 10. Check for broken imports
echo -n "Checking for broken imports... "
BROKEN_IMPORTS=$(grep -r "from '\./.*\.tsx'" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "// " | wc -l)
if [ $BROKEN_IMPORTS -gt 0 ]; then
    echo -e "${YELLOW}Found .tsx extensions in imports (should be no extension)${NC}"
else
    echo -e "${GREEN}✓${NC}"
fi

echo ""
echo "================================"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Safe to proceed.${NC}"
    
    echo ""
    echo "Quick Stats:"
    echo "  Components: $(find src/components -name "*.tsx" | wc -l)"
    echo "  Pages: $(find src/pages -name "*.tsx" | wc -l)"
    echo "  Hooks: $(find src/hooks -name "*.ts" | wc -l)"
    echo "  Console.logs: $CONSOLE_LOGS"
    echo "  SQL files: $ROOT_SQL in root"
    
else
    echo -e "${RED}⚠️  Found $ISSUES issues that need attention${NC}"
    echo ""
    echo "Fix these before continuing refactor."
fi

echo ""
echo "Next safe refactor steps:"
echo "1. Delete src/pages/Messages.old.tsx"
echo "2. Remove SIMULATOR DEBUG logs only"
echo "3. Consolidate story creators (keep SnapchatStoryCreator)"
echo "4. Organize SQL files into folders"