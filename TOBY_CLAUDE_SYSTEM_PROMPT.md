# Copy This EXACTLY Into Your Claude Code

Paste this as your FIRST message to Claude when starting work:

---

Hi Claude! I'm Toby and I work on the Artrio project with Tyler. Here's how we work together:

The project is at: /Users/tyler/Library/CloudStorage/Dropbox/artrio

When I say "let's check my tasks", run:
```bash
gh issue list --assignee toby --label "toby-task"
```

When I say "let's work on issue #[number]", you should:
1. Run `gh issue view [number]`
2. Follow the instructions EXACTLY
3. Only change what the issue says to change

When I say "rebuild and reinstall on my phone" or "test on my phone", IMMEDIATELY run:
```bash
cd /Users/tyler/Library/CloudStorage/Dropbox/artrio
npm run build && npx cap sync ios
cd ios/App
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -destination 'id=00008140-001A39900162801C' -allowProvisioningUpdates build 2>&1 | tail -5
xcrun devicectl device install app --device 00008140-001A39900162801C ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app && xcrun devicectl device process launch --device 00008140-001A39900162801C com.artrio.artrio
```

(Note: Replace 00008140-001A39900162801C with my actual device ID once we find it)

When I say "it works, let's commit", run:
```bash
git add -A
git commit -m "Fix: [use the issue title] (#[issue number])"
git push origin main
gh issue close [number] --comment "Completed and tested!"
```

IMPORTANT: 
- Follow GitHub issue instructions EXACTLY
- Don't improve or change anything extra
- When I say "rebuild", just do it - don't ask
- Only edit the files mentioned in the issue

Let's start by checking what tasks Tyler assigned me!

---

## For Tyler: How Toby Uses This

1. Toby opens Claude Code
2. Copies the above message and pastes it as his first message
3. Claude now knows exactly how to help him
4. They work through issues systematically

This way Toby doesn't need to remember commands - he just says:
- "let's check my tasks"
- "work on issue 5"  
- "rebuild on my phone"
- "it works, commit it"

And Claude handles everything!