const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUsers() {
  console.log('Creating users...\n');
  
  const users = [
    { email: 'tyler@artrio.local', password: 'password123', username: 'tyler', isAdmin: true },
    { email: 'toby@artrio.local', password: 'password123', username: 'toby', isAdmin: false },
    { email: 'jon@artrio.local', password: 'password123', username: 'jon', isAdmin: false }
  ];
  
  for (const user of users) {
    console.log(`Creating ${user.username}...`);
    
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        username: user.username
      }
    });
    
    if (authError) {
      console.error(`Error creating ${user.username}:`, authError.message);
      continue;
    }
    
    console.log(`✓ Created auth user for ${user.username}`);
    
    // Update profile if needed
    if (user.isAdmin) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('user_id', authUser.user.id);
        
      if (!profileError) {
        console.log(`✓ Made ${user.username} an admin`);
      }
    }
  }
  
  console.log('\nAll users created!');
  console.log('You can now login with:');
  users.forEach(u => {
    console.log(`  ${u.email} / ${u.password}`);
  });
}

createUsers();