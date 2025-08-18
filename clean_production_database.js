import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use production Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get all auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return;
    }

    console.log(`\nFound ${users?.length || 0} auth users:`);
    users?.forEach(u => {
      console.log(`  - ${u.email} (ID: ${u.id}, Created: ${u.created_at})`);
    });

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will DELETE all users from the production database!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all profiles first (due to foreign key constraints)
    if (profiles && profiles.length > 0) {
      console.log('🗑️  Deleting all profiles...');
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .gte('created_at', '2000-01-01'); // Delete everything
      
      if (deleteProfileError) {
        console.error('Error deleting profiles:', deleteProfileError);
        return;
      }
      console.log(`✅ Deleted ${profiles.length} profiles`);
    }

    // Delete all auth users
    if (users && users.length > 0) {
      console.log('🗑️  Deleting all auth users...');
      for (const user of users) {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
          console.error(`Error deleting user ${user.email}:`, error);
        } else {
          console.log(`  ✅ Deleted ${user.email}`);
        }
      }
    }

    // Clean up any orphaned data in other tables
    console.log('\n🧹 Cleaning up related tables...');
    
    const tablesToClean = [
      'trios',
      'trio_members', 
      'posts',
      'post_likes',
      'post_comments',
      'friend_requests',
      'user_blocks',
      'age_verification_attempts'
    ];

    for (const table of tablesToClean) {
      const { error } = await supabase
        .from(table)
        .delete()
        .gte('created_at', '2000-01-01');
      
      if (error) {
        console.log(`  ⚠️  Could not clean ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ Cleaned ${table}`);
      }
    }

    console.log('\n✨ Database cleaned successfully!');
    console.log('The production database is now empty and ready for fresh data.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the cleanup
cleanDatabase();