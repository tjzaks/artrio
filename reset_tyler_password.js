import { createClient } from '@supabase/supabase-js';

// LOCAL SUPABASE
const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetTylerPassword() {
  console.log('Resetting Tyler\'s password...\n');

  // Get Tyler's user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const tyler = users?.find(u => u.email === 'tyler@artrio.com');

  if (!tyler) {
    console.log('Tyler not found! Creating tyler...');
    
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: 'tyler@artrio.com',
      password: 'test123',
      email_confirm: true,
      user_metadata: { username: 'tyler' }
    });

    if (error) {
      console.error('Error creating tyler:', error);
      return;
    }

    // Make tyler admin
    await supabase
      .from('profiles')
      .update({ 
        username: 'tyler', 
        is_admin: true,
        display_name: 'Tyler',
        bio: 'Artrio Admin'
      })
      .eq('user_id', newUser.user.id);

    console.log('✅ Tyler created with password: test123');
  } else {
    // Update password
    const { error } = await supabase.auth.admin.updateUserById(
      tyler.id,
      { password: 'test123' }
    );

    if (error) {
      console.error('Error updating password:', error);
    } else {
      console.log('✅ Tyler\'s password reset to: test123');
    }
  }

  console.log('\n📝 Login info:');
  console.log('  URL: http://localhost:8080');
  console.log('  Username: tyler');
  console.log('  Password: test123');
  console.log('  Or email: tyler@artrio.com');
}

resetTylerPassword();