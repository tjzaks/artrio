# Tyler → Claude → Toby Delegation Flow

## How It Works

1. **Tyler finds issue:** "The send button is gray but should be purple"
2. **Tyler says:** "Tell Toby to fix this"  
3. **Claude:** Creates GitHub issue with exact instructions
4. **Toby:** Gets notified, uses Claude Code to complete it

## Tyler's Trigger Phrases

When Tyler says any of these:
- "Tell Toby to fix this"
- "Delegate this to Toby"
- "This is a Toby task"
- "Give this to Toby"
- "Toby should handle this"

Claude will:
1. Identify the exact issue
2. Find the exact code location
3. Create a GitHub issue with step-by-step fix
4. Assign it to Toby with proper labels

## Example Flow

**Tyler:** "The Friends page says 'Loading friends...' but it should show a spinner. Tell Toby."

**Claude:** 
```bash
gh issue create --title "[TOBY] Replace loading text with spinner on Friends page" \
  --assignee toby \
  --label "toby-task,easy,ui-only" \
  --body "[exact instructions with code]"
```

**Result:** Issue #5 created, Toby notified

## That's It!

No scripts, no complexity. Just:
- Find issue
- Say "tell Toby"  
- Claude handles everything
- Toby fixes it