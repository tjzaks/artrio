import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function grantAdminAccess() {
  try {
    // First find the user
    console.log('Looking for tobyszaks...');
    const { data: users, error: searchError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .or('username.eq.tobyszaks,username.eq.toby,username.ilike.%toby%');

    if (searchError) {
      console.error('Error searching for user:', searchError);
      return;
    }

    console.log('Found users:', users);

    if (!users || users.length === 0) {
      console.log('No user found with username containing "toby"');
      return;
    }

    // Find the most likely match (prefer exact 'tobyszaks')
    let targetUser = users.find(u => u.username === 'tobyszaks') || 
                     users.find(u => u.username === 'toby') ||
                     users[0];

    console.log('Updating user:', targetUser.username);

    // Update to admin
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', targetUser.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return;
    }

    console.log('✅ Successfully granted admin access to:', data.username);
    console.log('User details:', {
      id: data.id,
      username: data.username,
      role: data.role
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

grantAdminAccess();