import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function deepDebug() {
  console.log('=== DEEP DEBUG: Message Display Issue ===\n');

  // First login as a test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tyler@szakacsmedia.com',
    password: 'T3stP@ssw0rd!'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('Logged in as:', authData.user.email);
  console.log('User ID:', authData.user.id);

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  console.log('\nProfile ID:', profile?.id);
  console.log('Username:', profile?.username);

  // Try to get conversations using the RPC function
  console.log('\n--- Testing get_conversations RPC ---');
  const { data: rpcConvs, error: rpcError } = await supabase
    .rpc('get_conversations');

  if (rpcError) {
    console.error('RPC Error:', rpcError);
  } else {
    console.log(`RPC returned ${rpcConvs?.length || 0} conversations`);
    if (rpcConvs && rpcConvs.length > 0) {
      console.log('First conversation:', JSON.stringify(rpcConvs[0], null, 2));
    }
  }

  // Try direct query on conversations
  console.log('\n--- Testing direct conversation query ---');
  const { data: directConvs, error: directError } = await supabase
    .from('conversations')
    .select('*')
    .limit(5);

  if (directError) {
    console.error('Direct query error:', directError);
  } else {
    console.log(`Found ${directConvs?.length || 0} conversations directly`);
  }

  // Check conversation_participants
  console.log('\n--- Testing conversation_participants ---');
  const { data: participants, error: partError } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('user_id', authData.user.id);

  if (partError) {
    console.error('Participants error:', partError);
  } else {
    console.log(`User is in ${participants?.length || 0} conversations`);
    if (participants && participants.length > 0) {
      const convId = participants[0].conversation_id;
      console.log(`\nChecking messages for conversation: ${convId}`);
      
      // Try to get messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Messages error:', msgError);
      } else {
        console.log(`Found ${messages?.length || 0} messages`);
        if (messages && messages.length > 0) {
          console.log('First message:', JSON.stringify(messages[0], null, 2));
        }
      }
    }
  }

  // Check if there are ANY messages in the database
  console.log('\n--- Checking total messages ---');
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total messages in database: ${totalMessages}`);

  // Check the actual table structure
  console.log('\n--- Checking table structure ---');
  const { data: columns } = await supabase.rpc('get_table_columns', {
    table_name: 'messages'
  }).catch(() => ({ data: null }));

  if (columns) {
    console.log('Messages table columns:', columns);
  }
}

deepDebug().then(() => process.exit(0));