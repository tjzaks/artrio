import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

async function fixConversationsV2() {
  console.log('🔧 Fixing conversations display issue...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // Drop old function
    console.log('Dropping old function...');
    await client.query('DROP FUNCTION IF EXISTS get_conversations()');

    // Create new function that returns array directly
    console.log('Creating new get_conversations function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION get_conversations()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', c.id,
            'other_user', json_build_object(
              'id', CASE 
                WHEN c.user1_id = auth.uid() THEN c.user2_id
                ELSE c.user1_id
              END,
              'username', COALESCE(
                CASE 
                  WHEN c.user1_id = auth.uid() THEN p2.username
                  ELSE p1.username
                END,
                'Unknown User'
              ),
              'avatar_url', CASE 
                WHEN c.user1_id = auth.uid() THEN p2.avatar_url
                ELSE p1.avatar_url
              END
            ),
            'last_message', c.last_message_text,
            'last_message_at', c.last_message_at,
            'unread_count', COALESCE(
              CASE 
                WHEN c.user1_id = auth.uid() THEN c.user1_unread_count
                ELSE c.user2_unread_count
              END,
              0
            ),
            'is_blocked', COALESCE(
              CASE 
                WHEN c.user1_id = auth.uid() THEN c.is_blocked_by_user1
                ELSE c.is_blocked_by_user2
              END,
              false
            )
          ) ORDER BY c.last_message_at DESC NULLS LAST
        ), '[]'::json) INTO result
        FROM conversations c
        LEFT JOIN profiles p1 ON p1.user_id = c.user1_id
        LEFT JOIN profiles p2 ON p2.user_id = c.user2_id
        WHERE auth.uid() IN (c.user1_id, c.user2_id);
        
        RETURN result;
      END;
      $$
    `);

    await client.query('GRANT EXECUTE ON FUNCTION get_conversations() TO authenticated');
    console.log('✅ Function recreated successfully');

    // Test with Supabase client
    console.log('\n🧪 Testing with Supabase client...');
    
    const supabaseUrl = 'http://127.0.0.1:54321';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
    const supabase = createClient(supabaseUrl, anonKey);

    const { data: auth } = await supabase.auth.signInWithPassword({
      email: 'tyler@artrio.com',
      password: 'test123'
    });

    if (auth?.user) {
      console.log('✅ Logged in as Tyler');
      
      // Get conversations
      const { data: convs, error } = await supabase.rpc('get_conversations');
      
      if (error) {
        console.log('❌ Error getting conversations:', error);
      } else {
        console.log(`✅ Got ${Array.isArray(convs) ? convs.length : 0} conversations`);
        
        if (Array.isArray(convs) && convs.length > 0) {
          console.log('\n📱 Conversation with JoshyB:');
          const joshybConv = convs[0];
          console.log('  Username:', joshybConv.other_user?.username);
          console.log('  Last message:', joshybConv.last_message);
          console.log('  Time:', joshybConv.last_message_at ? new Date(joshybConv.last_message_at).toLocaleTimeString() : 'N/A');
        }
      }
    }

    console.log('\n🎉 Conversations should now display properly in the UI!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixConversationsV2();