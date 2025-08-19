import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMessagesCompletely() {
  console.log('Analyzing and fixing message system...\n');

  // 1. Check if there are ANY conversations
  const { data: convs, error: convError } = await supabase
    .from('conversations')
    .select('*');

  console.log(`Found ${convs?.length || 0} conversations in database`);
  
  if (convs && convs.length > 0) {
    console.log('First conversation:', convs[0]);
  }

  // 2. Check if there are ANY messages
  const { count: msgCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  console.log(`Found ${msgCount || 0} messages in database`);

  // 3. Check conversation_participants
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('*');

  console.log(`Found ${participants?.length || 0} conversation participants`);

  // 4. Get all users to create test conversations
  const { data: users } = await supabase
    .from('profiles')
    .select('*');

  console.log(`\nFound ${users?.length || 0} users:`);
  users?.forEach(u => console.log(`- ${u.username} (ID: ${u.user_id})`));

  if (users && users.length >= 2 && (!convs || convs.length === 0)) {
    console.log('\nNo conversations exist. Creating test conversation between first two users...');
    
    const user1 = users[0];
    const user2 = users[1];

    // Create a conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        user1_id: user1.user_id,
        user2_id: user2.user_id,
        is_blocked: false,
        last_sender_id: null,
        awaiting_response: false
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
    } else {
      console.log('Created conversation:', newConv.id);

      // Add participants
      await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user1.user_id },
          { conversation_id: newConv.id, user_id: user2.user_id }
        ]);

      // Add a test message
      const { data: msg, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConv.id,
          sender_id: user1.user_id,
          content: 'Hello! This is a test message.',
          is_read: false
        })
        .select()
        .single();

      if (msgError) {
        console.error('Error creating message:', msgError);
      } else {
        console.log('Created test message:', msg.id);
        
        // Update conversation with last message info
        await supabase
          .from('conversations')
          .update({
            last_sender_id: user1.user_id,
            awaiting_response: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', newConv.id);
      }
    }
  }

  // 5. Test the get_conversations RPC
  console.log('\nTesting get_conversations RPC...');
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('get_conversations');

  if (rpcError) {
    console.error('RPC Error:', rpcError);
    console.log('\nThe get_conversations function might be broken. Here\'s the core issue.');
  } else {
    console.log(`RPC returned ${rpcResult?.length || 0} conversations`);
  }
}

fixMessagesCompletely().then(() => process.exit(0));