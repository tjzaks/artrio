import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testMessagesFetch() {
  console.log('Testing messages fetch issue...\n');

  // Login
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'tzaks2@gmail.com',
    password: 'TEst!!123'
  });

  if (!auth.user) {
    console.error('Failed to login');
    return;
  }

  console.log('Logged in as:', auth.user.email);

  // Get conversations using RPC
  const { data: conversations, error: convError } = await supabase
    .rpc('get_conversations');

  if (convError) {
    console.error('Error getting conversations:', convError);
    return;
  }

  console.log(`Found ${conversations?.length || 0} conversations\n`);

  if (conversations && conversations.length > 0) {
    const conv = conversations[0];
    console.log('First conversation structure:');
    console.log('ID:', conv.id);
    console.log('Type:', conv.type);
    console.log('Other user:', conv.other_user);
    console.log('Last message:', conv.last_message);
    
    // Now try to fetch messages for this conversation
    console.log(`\nTrying to fetch messages for conversation ${conv.id}...`);
    
    // Method 1: Direct query
    const { data: messages1, error: error1 } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    if (error1) {
      console.error('Method 1 (direct) failed:', error1);
    } else {
      console.log(`Method 1: Found ${messages1?.length || 0} messages`);
    }

    // Method 2: Check if conversation_id format is different
    console.log('\nChecking messages table for any messages...');
    const { data: allMessages, error: allError } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, content')
      .limit(5);

    if (!allError && allMessages) {
      console.log('Sample messages from database:');
      allMessages.forEach(msg => {
        console.log(`- Conv: ${msg.conversation_id}, Sender: ${msg.sender_id}, Content: ${msg.content?.substring(0, 50)}`);
      });
    }

    // Method 3: Check if it's a trio conversation
    if (conv.type === 'trio') {
      console.log('\nThis is a TRIO conversation - checking trio_id format...');
      
      // Try using trio_id as conversation_id
      const { data: trioMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', `trio_${conv.id}`)
        .order('created_at', { ascending: true });

      console.log(`Trio format: Found ${trioMessages?.length || 0} messages`);
    }
  }
}

testMessagesFetch().then(() => process.exit(0));