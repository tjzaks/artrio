-- Force PostgREST to refresh its schema cache
-- This ensures it knows about the read_at column

-- Option 1: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Option 2: Touch the messages table to force refresh
ALTER TABLE messages ADD COLUMN IF NOT EXISTS _temp_refresh BOOLEAN DEFAULT NULL;
ALTER TABLE messages DROP COLUMN IF EXISTS _temp_refresh;

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('is_read', 'read_at', 'edited_at');

-- Check a sample message with read status
SELECT id, sender_id, is_read, read_at, created_at
FROM messages 
WHERE is_read = true 
LIMIT 5;