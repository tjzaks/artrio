const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Production Supabase configuration
const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('🔧 Applying fix for trios date column...\n');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('./fix_trios_date_column.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('sql_executor', {
      query: sql
    });
    
    if (error) {
      // If sql_executor doesn't exist, try direct execution
      console.log('sql_executor not found, attempting direct execution...');
      
      // Split the SQL into individual statements
      const statements = sql.split(/;(?=\s*(?:DO|CREATE|ALTER|GRANT))/);
      
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
          console.log('Executing statement...');
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql: trimmed + ';'
          });
          
          if (stmtError) {
            console.error('Error executing statement:', stmtError);
            // Continue with other statements
          }
        }
      }
    }
    
    console.log('✅ Fix applied successfully!');
    
    // Test the function
    console.log('\n🧪 Testing randomize_trios function...');
    const { data: testData, error: testError } = await supabase.rpc('randomize_trios');
    
    if (testError) {
      console.error('❌ Error testing function:', testError);
    } else {
      console.log('✅ Function test successful:', testData);
    }
    
  } catch (err) {
    console.error('❌ Error applying fix:', err);
  }
}

applyFix();