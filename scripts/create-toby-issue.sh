#!/bin/bash

# Script to quickly create Toby-friendly issues when we find simple bugs
# Usage: ./scripts/create-toby-issue.sh "title" "file_path" "find_code" "replace_code"

echo "🎯 Creating Toby Issue..."

# Prompt for issue details
read -p "Issue title (brief): " TITLE
read -p "File to edit (full path from /src): " FILE_PATH
read -p "What needs fixing (one line): " DESCRIPTION
echo "Paste the EXACT code to find (Ctrl-D when done):"
FIND_CODE=$(cat)
echo "Paste the EXACT replacement code (Ctrl-D when done):"
REPLACE_CODE=$(cat)
read -p "How to test this fix: " TEST_STEPS
read -p "Is this iOS specific? (y/n): " IS_IOS

# Set labels based on type
LABELS="toby-task,easy,no-delete"
if [ "$IS_IOS" = "y" ]; then
    LABELS="$LABELS,ios"
    PLATFORM_NOTES="

## iOS Testing Required
- Build with: \`npm run build && npx cap sync ios\`
- Test on Tyler's iPhone via Xcode
- Follow XCODE_TIPS.md for build instructions"
else
    LABELS="$LABELS,ui-only"
    PLATFORM_NOTES=""
fi

# Create the issue
gh issue create --title "[TOBY] $TITLE" --label "$LABELS" --assignee "toby" --body "## Task Description
$DESCRIPTION

## Current State
The code currently has an issue that needs fixing.

## Desired Outcome  
The fix should resolve the issue without breaking anything else.

## Files to Edit
- [ ] \`$FILE_PATH\`

## Step-by-Step Instructions
1. Open the file: \`$FILE_PATH\`
2. Find this exact code:
   \`\`\`tsx
$FIND_CODE
   \`\`\`
3. Replace it with:
   \`\`\`tsx
$REPLACE_CODE
   \`\`\`
4. Save the file
5. Test by: $TEST_STEPS

## Testing Checklist
- [ ] Run \`npm run lint\` - should pass with no errors
- [ ] Run \`npm run build\` - should complete successfully
- [ ] Test the specific fix works
- [ ] Verify nothing else broke$PLATFORM_NOTES

## What NOT to Do
- Don't change anything else in the file
- Don't modify imports unless shown above
- Don't delete any code except what's being replaced
- Don't create new files

## Success Criteria
✅ The task is complete when:
- [ ] The exact code change is made
- [ ] Linter passes
- [ ] Build succeeds
- [ ] The fix is tested and working

## Context
This bug was discovered during development. It's a simple fix that just needs careful execution.

---
*Found by: Tyler/Claude during development*
*Delegation reason: Simple, safe fix with clear boundaries*"

echo "✅ Issue created and assigned to Toby!"