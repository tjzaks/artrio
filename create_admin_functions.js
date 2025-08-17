import pg from 'pg';
const { Client } = pg;

async function createAdminFunctions() {
  console.log('🔧 Creating missing admin functions...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // Create admin_logs table if it doesn't exist
    console.log('Creating admin_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        action TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create delete_todays_trios function
    console.log('Creating delete_todays_trios function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.delete_todays_trios()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Delete all trios for today's date
        DELETE FROM trios 
        WHERE date = CURRENT_DATE::text;
        
        -- Log the action (if admin_logs exists)
        BEGIN
          INSERT INTO admin_logs (action, details)
          VALUES ('delete_todays_trios', json_build_object(
            'deleted_at', NOW(),
            'date', CURRENT_DATE::text
          ));
        EXCEPTION WHEN undefined_table THEN
          -- Ignore if admin_logs doesn't exist
          NULL;
        END;
      END;
      $$
    `);

    // Grant permission
    await client.query(`
      GRANT EXECUTE ON FUNCTION public.delete_todays_trios() TO authenticated
    `);

    console.log('✅ delete_todays_trios function created!');

    // Create cleanup_expired_posts function
    console.log('\nCreating cleanup_expired_posts function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.cleanup_expired_posts()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Delete posts older than 24 hours
        DELETE FROM posts 
        WHERE created_at < NOW() - INTERVAL '24 hours';
        
        -- Log the action
        BEGIN
          INSERT INTO admin_logs (action, details)
          VALUES ('cleanup_expired_posts', json_build_object(
            'cleaned_at', NOW()
          ));
        EXCEPTION WHEN undefined_table THEN
          NULL;
        END;
      END;
      $$
    `);

    await client.query(`
      GRANT EXECUTE ON FUNCTION public.cleanup_expired_posts() TO authenticated
    `);

    console.log('✅ cleanup_expired_posts function created!');

    // Test the functions
    console.log('\n🧪 Testing functions...');
    
    // Test delete_todays_trios
    await client.query('SELECT delete_todays_trios()');
    console.log('✅ delete_todays_trios works!');

    // Test cleanup_expired_posts  
    await client.query('SELECT cleanup_expired_posts()');
    console.log('✅ cleanup_expired_posts works!');

    console.log('\n🎉 All admin functions created successfully!');
    console.log('The "Delete Today\'s Trios" button will now work in the admin panel.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createAdminFunctions();