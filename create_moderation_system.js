import pg from 'pg';
const { Client } = pg;

async function createModerationSystem() {
  console.log('🔧 Creating complete moderation system...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // 1. Create moderation_actions table for user moderation
    console.log('1️⃣ Creating moderation_actions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS moderation_actions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        moderator_id UUID NOT NULL REFERENCES auth.users(id),
        target_user_id UUID NOT NULL REFERENCES auth.users(id),
        action_type TEXT NOT NULL, -- 'warning', 'mute', 'ban', 'unmute', 'unban'
        reason TEXT NOT NULL,
        duration_hours INTEGER, -- NULL for permanent
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_moderation_target ON moderation_actions(target_user_id);
      CREATE INDEX IF NOT EXISTS idx_moderation_active ON moderation_actions(is_active);
    `);

    console.log('✅ moderation_actions table created');

    // 2. Update reported_content to include better info
    console.log('\n2️⃣ Enhancing reported_content table...');
    
    // Add columns if they don't exist
    await client.query(`
      ALTER TABLE reported_content 
      ADD COLUMN IF NOT EXISTS post_content TEXT,
      ADD COLUMN IF NOT EXISTS reported_username TEXT,
      ADD COLUMN IF NOT EXISTS reporter_username TEXT
    `);

    console.log('✅ reported_content enhanced');

    // 3. Create view for better report display
    console.log('\n3️⃣ Creating detailed reports view...');
    await client.query(`
      CREATE OR REPLACE VIEW detailed_reports AS
      SELECT 
        rc.*,
        reporter.username as reporter_name,
        reporter.display_name as reporter_display,
        reported.username as reported_name,
        reported.display_name as reported_display,
        p.content as post_text,
        p.media_url as post_media
      FROM reported_content rc
      LEFT JOIN profiles reporter ON reporter.user_id = rc.reporter_id
      LEFT JOIN profiles reported ON reported.user_id = rc.reported_user_id
      LEFT JOIN posts p ON p.id = rc.content_id AND rc.content_type = 'post'
    `);

    console.log('✅ detailed_reports view created');

    // 4. Create function to get enhanced reports
    console.log('\n4️⃣ Creating get_detailed_reports function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_detailed_reports()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        reports_json json;
      BEGIN
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', id,
            'status', status,
            'reason', reason,
            'description', description,
            'created_at', created_at,
            'reporter', json_build_object(
              'id', reporter_id,
              'username', reporter_name,
              'display_name', reporter_display
            ),
            'reported_user', json_build_object(
              'id', reported_user_id,
              'username', reported_name,
              'display_name', reported_display
            ),
            'content', json_build_object(
              'type', content_type,
              'id', content_id,
              'text', post_text,
              'media_url', post_media
            )
          ) ORDER BY created_at DESC
        ), '[]'::json) INTO reports_json
        FROM detailed_reports
        WHERE status = 'pending';

        RETURN json_build_object(
          'success', true,
          'reports', reports_json
        );
      END;
      $$
    `);

    await client.query('GRANT EXECUTE ON FUNCTION public.get_detailed_reports() TO authenticated');
    console.log('✅ get_detailed_reports function created');

    // 5. Create sample reports with full details
    console.log('\n5️⃣ Creating detailed sample reports...');
    
    // Get some users and posts
    const { rows: users } = await client.query(`
      SELECT user_id, username FROM profiles 
      WHERE username IN ('tyler', 'jonnyb', 'emma', 'jake')
    `);

    const { rows: posts } = await client.query(`
      SELECT id, content, user_id FROM posts LIMIT 1
    `);

    if (users.length >= 3) {
      // Create a more detailed report
      await client.query(`
        INSERT INTO reported_content (
          reporter_id,
          reported_user_id,
          content_type,
          content_id,
          reason,
          description,
          reporter_username,
          reported_username,
          post_content
        ) VALUES (
          $1, $2, 'post', $3,
          'Spam',
          'This user is posting repetitive spam messages',
          $4, $5, $6
        )
      `, [
        users[0].user_id,  // Tyler reporting
        users[1].user_id,  // JonnyB being reported
        posts[0]?.id || '00000000-0000-0000-0000-000000000000',
        users[0].username,
        users[1].username,
        posts[0]?.content || 'Sample post content'
      ]);

      console.log('✅ Detailed sample report created');
    }

    // 6. Test the system
    console.log('\n🧪 Testing the moderation system...');
    const { rows: detailedReports } = await client.query('SELECT get_detailed_reports() as result');
    const reports = detailedReports[0].result.reports;
    
    console.log(`\n📊 Reports in system: ${reports.length}`);
    if (reports.length > 0) {
      const report = reports[0];
      console.log('\n📝 Sample Report Details:');
      console.log(`  Reporter: ${report.reporter.username}`);
      console.log(`  Reported User: ${report.reported_user.username}`);
      console.log(`  Reason: ${report.reason}`);
      console.log(`  Content Type: ${report.content.type}`);
      console.log(`  Post Text: ${report.content.text?.substring(0, 50) || 'N/A'}...`);
    }

    console.log('\n🎉 MODERATION SYSTEM COMPLETE!');
    console.log('\n📋 How it works:');
    console.log('\n1️⃣ USER MODERATION (Moderation tab):');
    console.log('  • Search for users by username');
    console.log('  • View their moderation history');
    console.log('  • Apply actions: Warning, Mute, Ban');
    console.log('  • Set duration (hours) or permanent');
    console.log('  • All actions are logged');
    
    console.log('\n2️⃣ CONTENT REPORTS (Reports tab):');
    console.log('  • Shows WHO reported (reporter username)');
    console.log('  • Shows WHO was reported (reported user)');
    console.log('  • Shows WHAT was reported (post content)');
    console.log('  • Shows WHY (reason & description)');
    console.log('  • Admin can resolve or dismiss');
    
    console.log('\n3️⃣ WORKFLOW:');
    console.log('  1. User reports inappropriate content');
    console.log('  2. Admin sees report in Reports tab');
    console.log('  3. Admin reviews: reporter, reported user, content');
    console.log('  4. Admin takes action in Moderation tab if needed');
    console.log('  5. Admin marks report as resolved');

  } catch (error) {
    if (error.code === '42P07') {
      console.log('⚠️  Some objects already exist, continuing...');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await client.end();
  }
}

createModerationSystem();