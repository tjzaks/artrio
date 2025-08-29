import { createClient } from '@supabase/supabase-js';

// Use production Supabase
const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NTA3MTMsImV4cCI6MjA3MTAyNjcxM30.Wt-9b6ohRw4hpTwT_ewov5sVWmYTFPOFtvxEOZWD8wM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestAccount(email, password, username) {
  console.log(`Creating account for ${email}...`);
  
  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password: password,
  });
  
  if (authError) {
    console.error(`Error creating ${email}:`, authError.message);
    return;
  }
  
  if (authData.user) {
    console.log(`✅ Created auth account for ${email}`);
    console.log(`User ID: ${authData.user.id}`);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        username: username,
        bio: `Test account ${username}`,
        birthday: '2000-01-01'
      });
    
    if (profileError) {
      console.error(`Error creating profile for ${email}:`, profileError.message);
    } else {
      console.log(`✅ Created profile for ${username}`);
    }
  }
}

async function main() {
  console.log('Creating test accounts...\n');
  
  // Create testbot1
  await createTestAccount('testbot1@artrio.com', 'testbot1', 'testbot1');
  
  // Small delay between accounts
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create testbot2
  await createTestAccount('testbot2@artrio.com', 'testbot2', 'testbot2');
  
  console.log('\n✅ Test accounts created!');
  console.log('You can now login with:');
  console.log('- testbot1@artrio.com / testbot1');
  console.log('- testbot2@artrio.com / testbot2');
  
  process.exit(0);
}

main().catch(console.error);