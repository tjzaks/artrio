const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUsers() {
  console.log('\n=== Debugging User Accounts ===\n');
  
  // Check auth.users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  console.log('Auth Users:');
  console.log('-----------');
  if (users) {
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Username: ${user.user_metadata?.username}`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });
  }
  
  // Check profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .order('username');
    
  console.log('\nProfiles:');
  console.log('---------');
  if (profiles) {
    profiles.forEach(profile => {
      console.log(`Username: @${profile.username}`);
      console.log(`  User ID: ${profile.user_id}`);
      console.log(`  Display: ${profile.display_name}`);
      console.log(`  Admin: ${profile.is_admin}`);
      console.log('');
    });
  }
  
  // Test each login
  console.log('\nTesting Logins:');
  console.log('---------------');
  
  const testUsers = [
    { email: 'tyler@artrio.local', password: 'password123' },
    { email: 'toby@artrio.local', password: 'password123' },
    { email: 'jon@artrio.local', password: 'password123' }
  ];
  
  for (const user of testUsers) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });
    
    if (error) {
      console.log(`${user.email}: ❌ ${error.message}`);
      
      // Try with username instead
      const username = user.email.split('@')[0];
      const { data: usernameData, error: usernameError } = await supabase.rpc('get_email_from_username', {
        input_username: username
      });
      
      if (usernameData) {
        console.log(`  Found email for @${username}: ${usernameData}`);
      }
    } else {
      console.log(`${user.email}: ✅ Login successful`);
      await supabase.auth.signOut();
    }
  }
}

debugUsers();