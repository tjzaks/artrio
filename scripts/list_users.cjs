const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log('\n=== Current Users in Artrio ===\n');
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('username, display_name, is_admin, user_id')
    .order('created_at');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total users:', profiles.length);
  console.log('\nUser List:');
  console.log('----------');
  
  profiles.forEach((profile, index) => {
    console.log(`${index + 1}. Username: @${profile.username}`);
    console.log(`   Display Name: ${profile.display_name || 'Not set'}`);
    console.log(`   Admin: ${profile.is_admin ? 'Yes ✓' : 'No'}`);
    console.log('');
  });
}

listUsers();