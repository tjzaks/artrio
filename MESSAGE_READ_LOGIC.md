# Message Read/Unread Logic - How It Should Work

## The Simple Truth
From a coding perspective, read/unread is just a boolean flag on each message:
- **is_read = false**: Message hasn't been seen by recipient
- **is_read = true**: Message has been seen by recipient

## When Messages Should Be Created
1. **New message sent**: Always created with `is_read = false`
2. **Sender doesn't matter**: Even if I send a message, it starts as unread for the recipient

## When Messages Should Be Marked as Read
Messages should ONLY be marked as read when:
1. **Recipient opens the conversation** containing that message
2. **Recipient is actively viewing** the conversation when new messages arrive

## What Makes This Complex
The complexity comes from:
1. **Multiple conversations**: Need to track read status per conversation
2. **Real-time updates**: New messages arrive while app is open
3. **Sender vs Recipient**: Only count unread messages I RECEIVED, not ones I SENT

## The Current Problem
Right now, our code is likely:
1. Creating messages with wrong initial state
2. Marking messages as read too early/late
3. Counting messages incorrectly

## The Correct Implementation

### 1. Creating a Message
```typescript
// When sending a message
const newMessage = {
  conversation_id: conversationId,
  sender_id: currentUserId,
  content: messageText,
  is_read: false  // ALWAYS false initially
}
```

### 2. Counting Unread (for badge)
```sql
-- Count messages where:
-- 1. I'm in the conversation (either user1 or user2)
-- 2. Message is unread (is_read = false)
-- 3. I didn't send it (sender_id != my_id)

SELECT COUNT(*) 
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE (c.user1_id = my_id OR c.user2_id = my_id)
  AND m.is_read = false
  AND m.sender_id != my_id;
```

### 3. Marking as Read
```typescript
// When opening a conversation
await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('conversation_id', conversationId)
  .neq('sender_id', myUserId)  // Don't mark my own messages
  .eq('is_read', false);        // Only update unread ones
```

## Common Pitfalls
1. **Don't mark messages as read on app load** - Only when conversation opens
2. **Don't count your own sent messages** as unread
3. **Don't trust cached counts** - Always query fresh from DB
4. **Don't mark read globally** - Only for the specific conversation being viewed

## Apple/WhatsApp Approach
They use:
1. **Server-side read receipts**: Server tracks when message is displayed
2. **Delivery vs Read**: Two different states (we're simplifying to just read/unread)
3. **Per-device tracking**: They track read status per device (we don't need this)
4. **Push notification clearing**: When you open the conversation, it clears the push notification