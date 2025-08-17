import pg from 'pg';
const { Client } = pg;

async function fixGetConversations() {
  console.log('🔧 Fixing get_conversations function to return proper format...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // Drop and recreate the function with correct return format
    console.log('Updating get_conversations function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION get_conversations()
      RETURNS json[]
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json[];
      BEGIN
        SELECT ARRAY_AGG(
          json_build_object(
            'id', c.id,
            'other_user', json_build_object(
              'id', CASE 
                WHEN c.user1_id = auth.uid() THEN c.user2_id
                ELSE c.user1_id
              END,
              'username', CASE 
                WHEN c.user1_id = auth.uid() THEN p2.username
                ELSE p1.username
              END,
              'avatar_url', CASE 
                WHEN c.user1_id = auth.uid() THEN p2.avatar_url
                ELSE p1.avatar_url
              END
            ),
            'last_message', c.last_message_text,
            'last_message_at', c.last_message_at,
            'unread_count', CASE 
              WHEN c.user1_id = auth.uid() THEN c.user1_unread_count
              ELSE c.user2_unread_count
            END,
            'is_blocked', CASE 
              WHEN c.user1_id = auth.uid() THEN c.is_blocked_by_user1
              ELSE c.is_blocked_by_user2
            END
          ) ORDER BY c.last_message_at DESC NULLS LAST
        ) INTO result
        FROM conversations c
        LEFT JOIN profiles p1 ON p1.user_id = c.user1_id
        LEFT JOIN profiles p2 ON p2.user_id = c.user2_id
        WHERE auth.uid() IN (c.user1_id, c.user2_id);
        
        RETURN COALESCE(result, ARRAY[]::json[]);
      END;
      $$
    `);

    console.log('✅ Function updated to return array format');

    // Test the function
    console.log('\n🧪 Testing updated function...');
    
    // First login as Tyler
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = 'http://127.0.0.1:54321';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
    const supabase = createClient(supabaseUrl, anonKey);

    const { data: auth } = await supabase.auth.signInWithPassword({
      email: 'tyler@artrio.com',
      password: 'test123'
    });

    if (auth?.user) {
      const { data: convs, error } = await supabase.rpc('get_conversations');
      
      if (error) {
        console.log('❌ Error:', error);
      } else {
        console.log('✅ Conversations returned:', convs);
        if (Array.isArray(convs) && convs.length > 0) {
          console.log('\n📝 First conversation structure:');
          console.log('  ID:', convs[0].id);
          console.log('  Other user:', convs[0].other_user?.username);
          console.log('  Last message:', convs[0].last_message);
          console.log('  Unread count:', convs[0].unread_count);
        }
      }
    }

    console.log('\n🎉 Fix complete! Messages page should now show conversations properly.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixGetConversations();