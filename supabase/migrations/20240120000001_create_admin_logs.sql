-- Create admin_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Enable RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to read logs
CREATE POLICY "Admins can read admin logs" ON admin_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create policy for admins to insert logs
CREATE POLICY "Admins can create admin logs" ON admin_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_type,
    p_target_id,
    p_description,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Add some sample admin logs for testing (only if table was just created)
DO $$
BEGIN
  -- Check if table is empty
  IF NOT EXISTS (SELECT 1 FROM admin_logs LIMIT 1) THEN
    -- Insert sample data
    INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, metadata) 
    VALUES 
      ((SELECT user_id FROM profiles WHERE is_admin = true LIMIT 1), 'system_control', 'trios', 'all', 'Randomized all trios for today', '{"count": 5, "date": "2025-08-17"}'::jsonb),
      ((SELECT user_id FROM profiles WHERE is_admin = true LIMIT 1), 'user_moderation', 'user', 'user-123', 'Warned user for inappropriate behavior', '{"reason": "spam messages", "action": "warning"}'::jsonb),
      ((SELECT user_id FROM profiles WHERE is_admin = true LIMIT 1), 'content_moderation', 'post', 'post-456', 'Removed post for violating guidelines', '{"reason": "inappropriate content", "reporter": "user-789"}'::jsonb),
      ((SELECT user_id FROM profiles WHERE is_admin = true LIMIT 1), 'system_control', 'database', 'cleanup', 'Performed database cleanup', '{"removed_posts": 12, "removed_messages": 45}'::jsonb),
      ((SELECT user_id FROM profiles WHERE is_admin = true LIMIT 1), 'user_moderation', 'user', 'user-999', 'Unbanned user after appeal', '{"original_ban_date": "2025-08-10", "appeal_reason": "misunderstanding"}'::jsonb);
  END IF;
END $$;