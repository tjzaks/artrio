#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Load from environment variables - never hardcode credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(query) {
  console.log('Executing:', query);
  console.log('---');
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query });
    
    if (error) throw error;
    
    if (Array.isArray(data)) {
      // If data contains complex objects, show as JSON
      if (data.length > 0 && typeof data[0] === 'object') {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.table(data);
      }
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Get SQL from command line or use test query
const sql = process.argv.slice(2).join(' ') || 'SELECT COUNT(*) as count FROM profiles';

runSQL(sql);