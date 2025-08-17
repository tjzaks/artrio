#!/usr/bin/env node

// Direct Supabase SQL query executor
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nqwijkvpzyadpsegvgbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery(sql) {
  try {
    // Use Supabase's raw SQL execution via RPC
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    
    if (error) {
      // If execute_sql doesn't exist, try direct query
      console.log('Trying alternative method...');
      
      // For SELECT queries, we can use from() with raw SQL
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const { data, error } = await supabase
          .from('trios')
          .select('*')
          .limit(10);
        
        if (error) throw error;
        console.log('Results:', JSON.stringify(data, null, 2));
      } else {
        console.log('Note: Direct SQL execution requires Supabase admin access or custom RPC functions');
        console.log('SQL to run in Supabase dashboard:', sql);
      }
    } else {
      console.log('Results:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Get SQL from command line arguments
const sql = process.argv.slice(2).join(' ');

if (!sql) {
  console.log('Usage: node supabase_query.js "YOUR SQL QUERY"');
  process.exit(1);
}

runQuery(sql);