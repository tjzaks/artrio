const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use production Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  console.log('URL:', supabaseUrl);
  console.log('Key exists:', !!supabaseServiceKey);
  process.exit(1);
}

console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanDatabase() {
  try {
    console.log('🔍 Fetching all users from production database...\n');
    
    // Get all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, created_at, user_id');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return;
    }

    console.log(`Found ${profiles?.length || 0} profiles:`);
    profiles?.forEach(p => {
      console.log(`  - ${p.username || 'No username'} (ID: ${p.id}, Created: ${p.created_at})`);
    });

    // Filter out dummy users (keep those with _12 suffix and "Jonny B" which seems to be dummy data)
    const profilesToDelete = profiles?.filter(p => {
      const username = p.username?.toLowerCase() || '';
      // Keep dummy users (those with _12 suffix) and the original "Jonny B"
      const isDummy = username.endsWith('_12') || username === 'jonny b';
      return !isDummy; // Delete those that are NOT dummy users
    }
    ) || [];

    console.log(`\n⚠️  Will delete ${profilesToDelete.length} non-dummy profiles:`);
    profilesToDelete.forEach(p => {
      console.log(`  - ${p.username || 'No username'}`);
    });

    if (profilesToDelete.length === 0) {
      console.log('✅ No real users to delete. Database is clean!');
      return;
    }

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will DELETE these users from the production database!');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete non-dummy profiles
    console.log('🗑️  Deleting non-dummy profiles...');
    
    for (const profile of profilesToDelete) {
      // First delete the auth user
      if (profile.user_id) {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profile.user_id);
        if (authDeleteError) {
          console.log(`  ⚠️  Could not delete auth for ${profile.username}: ${authDeleteError.message}`);
        } else {
          console.log(`  ✅ Deleted auth user for ${profile.username}`);
        }
      }
      
      // Then delete the profile
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);
      
      if (profileDeleteError) {
        console.log(`  ⚠️  Could not delete profile ${profile.username}: ${profileDeleteError.message}`);
      } else {
        console.log(`  ✅ Deleted profile ${profile.username}`);
      }
    }

    console.log('\n✨ Database cleaned successfully!');
    console.log('All real users removed. Only dummy/test users remain.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the cleanup
cleanDatabase();