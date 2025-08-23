-- CHECK POSTS TABLE SCHEMA
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'posts'
ORDER BY ordinal_position;

-- Check if image_url exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'posts' 
            AND column_name = 'image_url'
        ) THEN '✅ image_url column EXISTS'
        ELSE '❌ image_url column MISSING!'
    END as status;