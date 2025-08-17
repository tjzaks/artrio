import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

async function fixPostsTable() {
  console.log('Fixing posts table schema...\n');

  // Connect directly to Postgres
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();
    
    // Add missing columns
    console.log('Adding media_url and media_type columns...');
    await client.query(`
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS media_url TEXT,
      ADD COLUMN IF NOT EXISTS media_type TEXT
    `);
    
    console.log('✅ Columns added successfully!');
    
    // Show current schema
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts'
      ORDER BY ordinal_position
    `);
    
    console.log('\nCurrent posts table schema:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
  
  console.log('\n✅ Schema fixed! Try posting again.');
}

fixPostsTable();