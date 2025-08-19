const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAllLogins() {
  console.log('\n=== Testing All User Logins ===\n');
  
  const users = [
    { email: 'tyler@artrio.local', password: 'password123' },
    { email: 'toby@artrio.local', password: 'password123' },
    { email: 'jon@artrio.local', password: 'password123' }
  ];
  
  for (const user of users) {
    console.log(`Testing ${user.email}...`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });
    
    if (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
    } else {
      console.log(`  ✅ SUCCESS! User logged in`);
      console.log(`     Username: ${data.user.user_metadata.username}`);
      
      // Sign out for next test
      await supabase.auth.signOut();
    }
    console.log('');
  }
}

testAllLogins();