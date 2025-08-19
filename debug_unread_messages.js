import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUnreadMessages() {
  console.log('=== DEBUGGING UNREAD MESSAGES ===\n');
  
  // Get the current user (you may need to adjust this)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Please login first or provide a user ID');
    // You can hardcode a user ID here for testing
    // const userId = 'YOUR_USER_ID_HERE';
    return;
  }
  
  console.log('Current User ID:', user.id);
  console.log('---\n');
  
  // Get all conversations for this user
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
  
  if (convError) {
    console.error('Error fetching conversations:', convError);
    return;
  }
  
  console.log(`Found ${conversations.length} conversations\n`);
  
  let totalUnreadCount = 0;
  
  for (const conv of conversations) {
    console.log(`\nConversation ID: ${conv.id}`);
    console.log(`Between users: ${conv.user1_id} and ${conv.user2_id}`);
    
    // Get all messages in this conversation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (msgError) {
      console.error('Error fetching messages:', msgError);
      continue;
    }
    
    // Count unread messages that are NOT from the current user
    const unreadMessages = messages.filter(msg => 
      !msg.is_read && msg.sender_id !== user.id
    );
    
    console.log(`Total messages (last 10): ${messages.length}`);
    console.log(`Unread messages: ${unreadMessages.length}`);
    
    if (unreadMessages.length > 0) {
      console.log('\nUnread message details:');
      unreadMessages.forEach(msg => {
        console.log(`  - ID: ${msg.id}`);
        console.log(`    Content: "${msg.content.substring(0, 50)}..."`);
        console.log(`    From: ${msg.sender_id}`);
        console.log(`    Date: ${msg.created_at}`);
        console.log(`    is_read: ${msg.is_read}`);
      });
    }
    
    totalUnreadCount += unreadMessages.length;
    console.log('---');
  }
  
  console.log(`\n=== TOTAL UNREAD MESSAGES: ${totalUnreadCount} ===`);
  
  // Now let's check what the query in Home.tsx would return
  console.log('\n=== CHECKING HOME.TSX QUERY ===');
  
  const conversationIds = conversations.map(c => c.id);
  
  const { data: homeQueryMessages, count: homeQueryCount, error: homeQueryError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, is_read', { count: 'exact' })
    .in('conversation_id', conversationIds)
    .eq('is_read', false)
    .neq('sender_id', user.id);
  
  if (homeQueryError) {
    console.error('Error with home query:', homeQueryError);
  } else {
    console.log(`Home.tsx query would return: ${homeQueryCount} unread messages`);
    if (homeQueryMessages && homeQueryMessages.length > 0) {
      console.log('\nBreakdown by conversation:');
      const convCounts = {};
      homeQueryMessages.forEach(msg => {
        convCounts[msg.conversation_id] = (convCounts[msg.conversation_id] || 0) + 1;
      });
      Object.entries(convCounts).forEach(([convId, count]) => {
        console.log(`  Conversation ${convId}: ${count} unread`);
      });
    }
  }
}

debugUnreadMessages().catch(console.error);