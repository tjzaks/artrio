import pg from 'pg';
const { Client } = pg;

async function createReportsFunctions() {
  console.log('🔧 Creating reports functions for admin panel...\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();

    // First, create reports table if it doesn't exist
    console.log('Creating reports table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        content_type TEXT NOT NULL, -- 'post', 'reply', 'user'
        content_id UUID NOT NULL,
        reporter_id UUID NOT NULL REFERENCES auth.users(id),
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by UUID REFERENCES auth.users(id)
      )
    `);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
    `);

    console.log('✅ Reports table created');

    // Create function to fetch reported content
    console.log('\nCreating fetch_reported_content function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.fetch_reported_content()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        pending_reports json;
        resolved_reports json;
      BEGIN
        -- Get pending reports
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', r.id,
            'content_type', r.content_type,
            'content_id', r.content_id,
            'reporter_id', r.reporter_id,
            'reason', r.reason,
            'description', r.description,
            'status', r.status,
            'created_at', r.created_at,
            'reporter', json_build_object(
              'username', p.username
            )
          ) ORDER BY r.created_at DESC
        ), '[]'::json) INTO pending_reports
        FROM reports r
        LEFT JOIN profiles p ON p.user_id = r.reporter_id
        WHERE r.status = 'pending';

        -- Get resolved reports (last 10)
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', r.id,
            'content_type', r.content_type,
            'content_id', r.content_id,
            'reporter_id', r.reporter_id,
            'reason', r.reason,
            'description', r.description,
            'status', r.status,
            'created_at', r.created_at,
            'resolved_at', r.resolved_at,
            'reporter', json_build_object(
              'username', p.username
            )
          ) ORDER BY r.resolved_at DESC
        ), '[]'::json) INTO resolved_reports
        FROM reports r
        LEFT JOIN profiles p ON p.user_id = r.reporter_id
        WHERE r.status IN ('resolved', 'dismissed')
        LIMIT 10;

        RETURN json_build_object(
          'success', true,
          'pending', pending_reports,
          'resolved', resolved_reports
        );
      END;
      $$
    `);

    await client.query('GRANT EXECUTE ON FUNCTION public.fetch_reported_content() TO authenticated');
    console.log('✅ fetch_reported_content function created');

    // Create function to resolve a report
    console.log('\nCreating resolve_report function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.resolve_report(
        report_id UUID,
        new_status TEXT,
        resolver_id UUID
      )
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        UPDATE reports
        SET 
          status = new_status,
          resolved_at = NOW(),
          resolved_by = resolver_id
        WHERE id = report_id;

        RETURN json_build_object(
          'success', true,
          'message', 'Report ' || new_status
        );
      END;
      $$
    `);

    await client.query('GRANT EXECUTE ON FUNCTION public.resolve_report(UUID, TEXT, UUID) TO authenticated');
    console.log('✅ resolve_report function created');

    // Create function to report content
    console.log('\nCreating report_content function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.report_content(
        p_content_type TEXT,
        p_content_id UUID,
        p_reporter_id UUID,
        p_reason TEXT,
        p_description TEXT
      )
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        report_id UUID;
      BEGIN
        -- Check if already reported by this user
        SELECT id INTO report_id
        FROM reports
        WHERE content_type = p_content_type
          AND content_id = p_content_id
          AND reporter_id = p_reporter_id
          AND status = 'pending';

        IF report_id IS NOT NULL THEN
          RETURN json_build_object(
            'success', false,
            'message', 'You have already reported this content'
          );
        END IF;

        -- Create new report
        INSERT INTO reports (content_type, content_id, reporter_id, reason, description)
        VALUES (p_content_type, p_content_id, p_reporter_id, p_reason, p_description)
        RETURNING id INTO report_id;

        RETURN json_build_object(
          'success', true,
          'report_id', report_id,
          'message', 'Content reported successfully'
        );
      END;
      $$
    `);

    await client.query('GRANT EXECUTE ON FUNCTION public.report_content(TEXT, UUID, UUID, TEXT, TEXT) TO authenticated');
    console.log('✅ report_content function created');

    // Test the function
    console.log('\n🧪 Testing fetch_reported_content...');
    const { rows } = await client.query('SELECT fetch_reported_content() as result');
    console.log('Result:', JSON.stringify(rows[0].result, null, 2));

    console.log('\n🎉 All reports functions created successfully!');
    console.log('The Reports tab in admin panel will now work.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createReportsFunctions();