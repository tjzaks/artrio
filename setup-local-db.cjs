const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🗄️  Setting up local database...');
console.log('📍 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  try {
    // Read and execute initial schema
    console.log('📋 Applying initial schema...');
    const schema = fs.readFileSync('supabase/migrations/001_initial_schema.sql', 'utf8');
    
    // Split the schema into individual statements (rough but works)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
          if (error && !error.message.includes('already exists')) {
            console.error('❌ Error executing:', statement.substring(0, 50), '...', error);
          } else {
            console.log('✅ Executed:', statement.substring(0, 50).replace(/\n/g, ' '), '...');
          }
        } catch (e) {
          console.log('⚠️  Statement might already exist:', statement.substring(0, 30), '...');
        }
      }
    }

    // Apply other migrations if they exist
    const migrationFiles = [
      'supabase/migrations/20240118000000_add_username_changes.sql',
      'supabase/migrations/20240119000000_add_birthday_functions.sql',
      'supabase/migrations/20240120000001_create_admin_logs.sql',
      'supabase/migrations/20240121000000_add_profile_enrichment.sql',
      'supabase/migrations/20240122000000_add_personality_type.sql',
      'supabase/migrations/20240123000000_username_reservations.sql',
      'supabase/migrations/20240124000000_content_moderation.sql',
      'supabase/migrations/20240125000000_update_content_moderation.sql'
    ];

    for (const file of migrationFiles) {
      if (fs.existsSync(file)) {
        console.log(`📋 Applying ${file}...`);
        const migration = fs.readFileSync(file, 'utf8');
        const statements = migration
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('--'));
        
        for (const statement of statements) {
          if (statement) {
            try {
              const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
              if (error && !error.message.includes('already exists')) {
                console.error('❌ Migration error:', error);
              }
            } catch (e) {
              // Ignore - probably already exists
            }
          }
        }
      }
    }

    // Create some test users
    console.log('👥 Creating test users...');
    const testUsers = [
      { email: 'dev@artrio.local', password: 'password123', username: 'dev_user', bio: 'Test developer account' },
      { email: 'tyler@szakacsmedia.com', password: 'password123', username: 'tzak', bio: 'Tyler - Admin account' },
      { email: 'alice@test.com', password: 'password123', username: 'alice', bio: 'Test user Alice' },
      { email: 'bob@test.com', password: 'password123', username: 'bob', bio: 'Test user Bob' }
    ];

    for (const user of testUsers) {
      try {
        const { data: authUser, error: signupError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        });

        if (signupError) {
          console.log(`⚠️  User ${user.email} might already exist`);
          continue;
        }

        // Create profile
        if (authUser.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: authUser.user.id,
              username: user.username,
              bio: user.bio,
              is_admin: user.email === 'tyler@szakacsmedia.com'
            });

          if (profileError && !profileError.message.includes('duplicate')) {
            console.error(`❌ Profile error for ${user.email}:`, profileError);
          } else {
            console.log(`✅ Created ${user.email} (${user.username})`);
          }
        }
      } catch (e) {
        console.log(`⚠️  ${user.email} setup skipped (might exist)`);
      }
    }

    console.log('🎉 Local database setup complete!');
    console.log('🌐 Supabase Studio: http://127.0.0.1:54323');
    console.log('📧 Email Inbox: http://127.0.0.1:54324');
    console.log('');
    console.log('Test accounts:');
    testUsers.forEach(user => {
      console.log(`   ${user.email} / password123`);
    });

  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

// Create SQL executor function first
async function createSQLExecutor() {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1;' });
    if (error && error.message.includes('function exec_sql')) {
      console.log('📝 Creating SQL executor function...');
      // Create the SQL executor function using the admin API
      const { error: createError } = await supabase.auth.admin.rpc('create_sql_executor');
      if (createError) {
        console.log('⚠️  Using manual queries instead of exec_sql function');
      }
    }
  } catch (e) {
    console.log('⚠️  SQL executor not available, continuing with manual setup...');
  }
}

setupDatabase();