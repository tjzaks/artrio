const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuth() {
  console.log('\n=== Checking Auth Users ===\n');
  
  // List all auth users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total auth users:', users.length);
  console.log('\nAuth Users:');
  console.log('-----------');
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });
  
  // Test login
  console.log('\nTesting login for tyler@artrio.local...');
  const { data, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'tyler@artrio.local',
    password: 'password123'
  });
  
  if (loginError) {
    console.error('Login failed:', loginError.message);
  } else {
    console.log('Login successful!');
  }
}

checkAuth();