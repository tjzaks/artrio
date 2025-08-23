# Senior Engineer → Toby Delegation Protocol

## When to Create a Toby Issue

### ✅ Perfect for Toby:
- **Simple UI text changes** (placeholders, labels, button text)
- **Color/style adjustments** (text color, background, padding)
- **Adding loading states** (spinners, skeletons, "Loading..." text)
- **Fixing obvious typos** in user-facing text
- **Adjusting spacing/margins** that are clearly wrong
- **Simple conditional rendering** (show/hide based on state)
- **Console.log cleanup** (removing debug statements)
- **Adding missing alt text** to images
- **Updating hardcoded values** to constants

### ❌ NOT for Toby:
- Anything involving Supabase/database changes
- Authentication or security fixes
- Complex state management
- API integrations
- Performance optimizations
- Architectural changes
- Anything requiring new npm packages
- Multi-file refactors

## Quick Delegation During Development

### Method 1: Inline Comment + Issue
When you find something while coding:

```tsx
// TODO: TOBY - Button text color too light
// Current: text-gray-400
// Should be: text-gray-700
// gh issue #[number]
className="text-gray-400 hover:text-gray-600"
```

Then create issue:
```bash
gh issue create --title "[TOBY] Fix button text color in [Component]" \
  --label "toby-task,easy,ui-only" \
  --assignee "toby" \
  --body "[generated from template]"
```

### Method 2: The Quick Script
```bash
# When you spot something:
./scripts/create-toby-issue.sh

# It will prompt you for:
# - Title
# - File path  
# - What to find
# - What to replace
# - How to test
```

### Method 3: Batch Issues After Session
Keep a running list during development:

```markdown
## Toby Issues Found:
1. Friends.tsx:142 - Loading text should be centered
2. Messages.tsx:88 - Send button should be purple not gray  
3. Profile.tsx:234 - Avatar placeholder is too small
4. Home.tsx:55 - "Tap here" should say "Swipe up"
```

Then create them all at once.

## Issue Quality Checklist

Before creating a Toby issue, ensure:
- [ ] The fix is truly isolated to one spot
- [ ] You can provide EXACT code to find/replace
- [ ] The change won't break anything else
- [ ] It's testable in browser or Xcode
- [ ] The instructions are step-by-step clear

## Real Examples from Artrio

### Example 1: Found during Messages debugging
```bash
# We notice the timestamp is gray and hard to read
gh issue create --title "[TOBY] Make message timestamps more visible" \
  --body "Change timestamp color from text-gray-400 to text-gray-600 in Messages.tsx line 312"
```

### Example 2: Found during iOS testing  
```bash
# Profile image is cut off on iPhone
gh issue create --title "[TOBY] Fix profile image aspect ratio on iOS" \
  --body "Change aspect-square to aspect-auto in Profile.tsx line 88" \
  --label "toby-task,easy,ios"
```

### Example 3: Found during code review
```bash
# Lots of console.logs left in production
gh issue create --title "[TOBY] Remove debug console.logs from Friends component" \
  --body "Remove all console.log statements from Friends.tsx (lines 44, 67, 102, 156)"
```

## The Delegation Mindset

Think of it like this:
- **You (Senior)**: Find the bug, diagnose it, figure out the fix
- **Toby (Junior)**: Execute the fix exactly as specified
- **Result**: You stay focused on hard problems, Toby learns by doing safe tasks

## Automating Issue Creation

### Add to your Claude Code workflow:
```markdown
When I say "delegate this to Toby", create a GitHub issue with:
1. The exact file and line number
2. The exact code to find
3. The exact replacement
4. Test instructions
5. Labels: toby-task, easy, [ui-only or ios]
```

### VSCode Snippet (for Tyler):
```json
{
  "Toby Issue": {
    "prefix": "toby",
    "body": [
      "// TODO: TOBY ISSUE",
      "// File: ${TM_FILEPATH}:${TM_LINE_NUMBER}",
      "// Find: ${1:current_code}",
      "// Replace: ${2:new_code}",
      "// Test: ${3:how_to_test}",
      "// Create issue: gh issue create --title \"[TOBY] ${4:title}\""
    ]
  }
}
```

## Tracking Toby's Progress

### See what's in progress:
```bash
gh issue list --assignee toby --label "toby-task" --state open
```

### See completion rate:
```bash
# Open vs Closed
gh issue list --assignee toby --label "toby-task" --state all --limit 50
```

### Quick review merged changes:
```bash
git log --author="toby" --oneline -10
```

## Progressive Difficulty

Start Toby with:
1. **Week 1**: Text changes, colors (1-line changes)
2. **Week 2**: Loading states, simple conditionals  
3. **Week 3**: Component styling, responsive fixes
4. **Week 4**: Simple component extraction, list rendering
5. **Month 2**: Basic state management, form validation

## Emergency Rollback

If Toby's change breaks something:
```bash
# Find the commit
git log --author="toby" --oneline

# Revert it
git revert [commit-hash]
git push origin main

# Reopen the issue with notes
gh issue reopen [number] --comment "Reverted - caused [issue]. Let's try again with clearer instructions."
```

---

## The Golden Rule

**If you spend more than 30 seconds fixing something simple, it should be a Toby issue.**

This way you stay focused on architecture, complex bugs, and features while Toby handles the mechanical fixes!