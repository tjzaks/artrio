import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugMessages() {
  console.log('Debugging messages display issue...\n');

  try {
    // First, get all conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(5);

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return;
    }

    console.log(`Found ${conversations?.length || 0} conversations\n`);

    if (conversations && conversations.length > 0) {
      // Check messages for first conversation
      const firstConv = conversations[0];
      console.log(`Checking messages for conversation: ${firstConv.id}`);
      
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', firstConv.id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Error fetching messages:', msgError);
      } else {
        console.log(`Found ${messages?.length || 0} messages in this conversation`);
        
        if (messages && messages.length > 0) {
          console.log('\nFirst message:');
          console.log(JSON.stringify(messages[0], null, 2));
          
          // Check sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', messages[0].sender_id)
            .single();
            
          console.log('\nSender profile:');
          console.log(JSON.stringify(profile, null, 2));
        }
      }
    }

    // Check if messages table has any data at all
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
      
    console.log(`\nTotal messages in database: ${count}`);

  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugMessages();