import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getAllEmails() {
  // Get all users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('username');
  
  console.log('// Username to Email mapping for Auth.tsx');
  console.log('const usernameToEmail: Record<string, string> = {');
  
  for (const profile of profiles || []) {
    const user = users?.find(u => u.id === profile.user_id);
    if (user) {
      console.log(`  '${profile.username.toLowerCase()}': '${user.email}',`);
    }
  }
  
  console.log('};');
}

getAllEmails();