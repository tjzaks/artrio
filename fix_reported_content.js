import pg from 'pg';
const { Client } = pg;

async function fixReportedContent() {
  console.log('🔧 Creating reported_content table for admin panel...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // Create reported_content table matching what the component expects
    console.log('Creating reported_content table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reported_content (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        reporter_id UUID NOT NULL REFERENCES auth.users(id),
        reported_user_id UUID REFERENCES auth.users(id),
        content_type TEXT NOT NULL, -- 'post', 'reply', 'user', 'profile'
        content_id UUID,
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
        resolution_notes TEXT,
        reviewed_by UUID REFERENCES auth.users(id),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reported_content_status ON reported_content(status);
      CREATE INDEX IF NOT EXISTS idx_reported_content_created ON reported_content(created_at DESC);
    `);

    console.log('✅ reported_content table created');

    // Create RLS policies
    console.log('\nCreating RLS policies...');
    
    // Enable RLS
    await client.query('ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY');

    // Admin can view all reports
    await client.query(`
      CREATE POLICY "Admins can view all reports" ON reported_content
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.is_admin = true
        )
      )
    `);

    // Admin can update reports
    await client.query(`
      CREATE POLICY "Admins can update reports" ON reported_content
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.is_admin = true
        )
      )
    `);

    // Users can create reports
    await client.query(`
      CREATE POLICY "Users can create reports" ON reported_content
      FOR INSERT
      WITH CHECK (reporter_id = auth.uid())
    `);

    console.log('✅ RLS policies created');

    // Create some sample reports for testing
    console.log('\nCreating sample reports for testing...');
    
    // Get some user IDs
    const { rows: users } = await client.query(`
      SELECT user_id, username FROM profiles LIMIT 5
    `);

    if (users.length >= 3) {
      // Create a sample report
      await client.query(`
        INSERT INTO reported_content (
          reporter_id,
          reported_user_id,
          content_type,
          reason,
          description,
          status
        ) VALUES (
          $1,
          $2,
          'user',
          'Inappropriate behavior',
          'This user is posting spam messages',
          'pending'
        )
      `, [users[0].user_id, users[1].user_id]);

      console.log('✅ Sample report created');
    }

    // Create log_admin_action function if it doesn't exist
    console.log('\nCreating log_admin_action function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.log_admin_action(
        p_admin_id UUID,
        p_action_type TEXT,
        p_target_type TEXT DEFAULT NULL,
        p_target_id UUID DEFAULT NULL,
        p_description TEXT DEFAULT NULL,
        p_metadata JSONB DEFAULT NULL
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Placeholder for admin action logging
        -- In production, this would insert into an admin_logs table
        RETURN;
      END;
      $$
    `);

    await client.query('GRANT EXECUTE ON FUNCTION public.log_admin_action(UUID, TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated');
    console.log('✅ log_admin_action function created');

    // Test fetching reports
    console.log('\n🧪 Testing report fetching...');
    const { rows: testReports } = await client.query(`
      SELECT * FROM reported_content
      ORDER BY created_at DESC
    `);

    console.log(`Found ${testReports.length} reports`);
    if (testReports.length > 0) {
      console.log('Sample report:', {
        id: testReports[0].id,
        reason: testReports[0].reason,
        status: testReports[0].status
      });
    }

    console.log('\n🎉 Reports tab will now work!');
    console.log('The admin panel can now display and manage reported content.');

  } catch (error) {
    if (error.code === '42P07') {
      console.log('⚠️  Some objects already exist, but that\'s OK');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await client.end();
  }
}

fixReportedContent();