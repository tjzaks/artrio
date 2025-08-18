#!/usr/bin/env node

/**
 * Admin Management Script
 * Usage: node scripts/manage_admin.cjs <email> [--remove]
 * 
 * Examples:
 *   node scripts/manage_admin.cjs dev@artrio.local       # Grant admin
 *   node scripts/manage_admin.cjs dev@artrio.local --remove  # Remove admin
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function manageAdmin(email, remove = false) {
  try {
    // Find user by email
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError) {
      // Try finding by username if email fails
      const { data: userByUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', email)
        .single();
      
      if (usernameError) {
        console.error(`❌ User not found: ${email}`);
        process.exit(1);
      }
      
      users = userByUsername;
    }
    
    // Update admin status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: !remove })
      .eq('id', users.id);
    
    if (updateError) {
      console.error('❌ Failed to update admin status:', updateError);
      process.exit(1);
    }
    
    const action = remove ? 'removed from' : 'granted';
    console.log(`✅ Admin privileges ${action} for ${email}`);
    console.log(`   User ID: ${users.id}`);
    console.log(`   Username: ${users.username}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/manage_admin.cjs <email> [--remove]');
  console.log('');
  console.log('Examples:');
  console.log('  Grant admin:  node scripts/manage_admin.cjs dev@artrio.local');
  console.log('  Remove admin: node scripts/manage_admin.cjs dev@artrio.local --remove');
  process.exit(0);
}

const email = args[0];
const remove = args.includes('--remove');

manageAdmin(email, remove);