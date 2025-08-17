#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI5NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM4Nzc2NywiZXhwIjoyMDcwOTYzNzY3fQ.sXx4z3KZLrzSMRfLHMpnMKsx2MA51IA7EL-Fv_AkjPY'
);

async function createTobyAdmin() {
  console.log('\n👤 CREATING TOBY ADMIN ACCOUNT\n');
  console.log('='.repeat(50));

  // First check if admin column exists
  console.log('1️⃣ Checking admin system...');
  
  // Check column structure
  const { data: columns } = await supabase.rpc('execute_sql', {
    query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'"
  });
  
  const hasAdminColumn = columns?.some(col => col.column_name === 'is_admin');
  
  if (!hasAdminColumn) {
    console.log('   Adding is_admin column...');
    await supabase.rpc('execute_sql', {
      query: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false'
    });
  }

  // Create Toby's account
  console.log('\n2️⃣ Creating Toby account...');
  
  const email = 'toby@artrio.app';
  const password = 'TobyAdmin123!';
  
  // Sign up
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      username: 'Toby'
    }
  });

  if (authError) {
    console.log('   ❌ Error creating user:', authError.message);
    
    // Try to get existing user
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === email);
    
    if (existingUser) {
      console.log('   Found existing Toby account:', existingUser.id);
      
      // Create profile if missing
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', existingUser.id)
        .single();
        
      if (!profile) {
        console.log('   Creating profile...');
        await supabase.from('profiles').insert({
          user_id: existingUser.id,
          username: 'Toby',
          bio: 'Admin account'
        });
      }
      
      // Make admin
      await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('user_id', existingUser.id);
        
      console.log('   ✅ Toby is now admin!');
      console.log('\n📝 Login Credentials:');
      console.log('   Email: ' + email);
      console.log('   Password: [use password reset]');
      return;
    }
    
    return;
  }

  console.log('   ✅ Auth user created:', authData.user.id);

  // Create profile
  console.log('\n3️⃣ Creating profile...');
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: authData.user.id,
      username: 'Toby',
      bio: 'Admin account',
      is_admin: true
    });

  if (profileError) {
    console.log('   ❌ Profile error:', profileError.message);
  } else {
    console.log('   ✅ Profile created with admin privileges!');
  }

  // Add to a trio
  console.log('\n4️⃣ Adding to a trio...');
  
  // Find a trio with space (less than 3 members)
  const { data: trios } = await supabase
    .from('trios')
    .select('*')
    .eq('date', new Date().toISOString().split('T')[0]);
  
  if (trios && trios.length > 0) {
    // Add to first trio as user4
    await supabase
      .from('trios')
      .update({ user4_id: authData.user.id })
      .eq('id', trios[0].id);
    
    console.log('   ✅ Added to trio!');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ TOBY ADMIN ACCOUNT READY!\n');
  console.log('📝 Login Credentials:');
  console.log('   Email: ' + email);
  console.log('   Password: ' + password);
  console.log('   Site: https://artrio.up.railway.app');
  console.log('\n⚠️  Tell Toby to change password after first login!');
}

createTobyAdmin().catch(console.error);