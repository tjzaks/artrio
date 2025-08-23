-- Add image_url column to messages table for photo sharing
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.messages.image_url IS 'URL of image attachment for photo messages';

-- Update RLS policies if needed (messages should already have proper policies)
-- Just verify the existing policies allow the new column

-- Test that the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'image_url';