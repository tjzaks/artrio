import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey);

async function createUsernameLoginFunction() {
  console.log('Creating username login helper function...');

  const { error } = await supabase.rpc('execute_sql', {
    sql: `
      -- Function to get email from username for login
      CREATE OR REPLACE FUNCTION get_email_from_username(input_username TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        user_email TEXT;
      BEGIN
        -- Get email from auth.users via profiles
        SELECT au.email INTO user_email
        FROM profiles p
        JOIN auth.users au ON au.id = p.user_id
        WHERE p.username = input_username
        LIMIT 1;
        
        RETURN user_email;
      END;
      $$;

      -- Grant execute permission
      GRANT EXECUTE ON FUNCTION get_email_from_username TO anon;
      GRANT EXECUTE ON FUNCTION get_email_from_username TO authenticated;
    `
  });

  if (error) {
    console.error('Error creating function:', error);
  } else {
    console.log('✅ Username login function created!');
  }

  // Test it
  console.log('\nTesting with tyler username...');
  const { data, error: testError } = await supabase
    .rpc('get_email_from_username', { input_username: 'tyler' });
  
  if (testError) {
    console.error('Test error:', testError);
  } else {
    console.log('Tyler\'s email:', data);
  }
}

createUsernameLoginFunction();