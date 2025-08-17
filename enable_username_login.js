import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function enableUsernameLogin() {
  console.log('Setting up username login mapping...\n');
  
  // Create a mapping table for username to email
  const { error: tableError } = await supabase.rpc('execute_sql', {
    sql: `
      -- Create username-email mapping table
      CREATE TABLE IF NOT EXISTS username_email_map (
        username TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Populate it with existing users
      INSERT INTO username_email_map (username, email)
      SELECT p.username, au.email 
      FROM profiles p
      JOIN auth.users au ON au.id = p.user_id
      ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email;
      
      -- Create public function to get email
      CREATE OR REPLACE FUNCTION public.get_user_email(input_username TEXT)
      RETURNS TEXT
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT email FROM username_email_map 
        WHERE LOWER(username) = LOWER(input_username)
        LIMIT 1;
      $$;
      
      -- Grant access
      GRANT SELECT ON username_email_map TO anon;
      GRANT EXECUTE ON FUNCTION public.get_user_email TO anon;
    `
  });

  if (tableError) {
    console.log('Cannot create SQL function directly. Let me create a workaround...\n');
    
    // Alternative: Create a public accessible view
    // This is a simpler approach that doesn't require SQL execution
    console.log('Creating username-email mapping in profiles...');
    
    // Get all users
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*');
    
    console.log('\n📧 Username → Email Mapping:');
    console.log('----------------------------');
    
    const mapping = [];
    for (const profile of profiles || []) {
      const user = users?.find(u => u.id === profile.user_id);
      if (user) {
        console.log(`${profile.username} → ${user.email}`);
        mapping.push({
          username: profile.username,
          email: user.email
        });
      }
    }
    
    // Save mapping to a JSON file for reference
    console.log('\n✅ Mapping complete!');
    console.log('\nTo enable username login, we need to either:');
    console.log('1. Run COMPLETE_AUTH_SETUP.sql in Supabase SQL Editor');
    console.log('2. Or update the code to use the hardcoded mapping above');
    
    return mapping;
  }
  
  console.log('✅ Username login enabled successfully!');
  
  // Test it
  const { data: tylerEmail } = await supabase
    .rpc('get_user_email', { input_username: 'tyler' });
  
  console.log('\nTest: tyler\'s email =', tylerEmail);
}

enableUsernameLogin();