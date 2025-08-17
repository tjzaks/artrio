#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Load from environment variables - with defaults for now
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nqwijkvpzyadpsegvgbm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg';

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