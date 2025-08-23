-- Quick fix to allow stories without trios
-- This creates a placeholder trio that stories can reference

-- Check if placeholder trio exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM trios WHERE id = '00000000-0000-0000-0000-000000000000'
  ) THEN
    -- Insert placeholder trio for stories
    INSERT INTO trios (
      id,
      user1_id,
      user2_id, 
      user3_id,
      date,
      created_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001', -- Dummy user IDs
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '1900-01-01', -- Old date so it never conflicts
      NOW()
    );
  END IF;
END $$;

-- Update the comment to indicate this is a special trio
COMMENT ON TABLE trios IS 'Trio assignments. ID 00000000-0000-0000-0000-000000000000 is reserved for stories without trios.';