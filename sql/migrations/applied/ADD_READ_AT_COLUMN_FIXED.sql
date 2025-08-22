-- ADD THE MISSING read_at COLUMN!
-- Fixed version - no updated_at column exists

-- Add the read_at column to track when messages are read
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Set read_at to created_at for existing read messages (as a default)
UPDATE messages 
SET read_at = created_at 
WHERE is_read = true 
AND read_at IS NULL;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('is_read', 'read_at', 'edited_at', 'created_at');

-- Check a sample
SELECT id, sender_id, is_read, read_at, created_at
FROM messages 
WHERE is_read = true 
LIMIT 5;

-- Force schema refresh
NOTIFY pgrst, 'reload schema';