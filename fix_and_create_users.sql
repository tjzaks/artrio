-- First check the profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Then check what we have
SELECT COUNT(*) as profile_count FROM profiles;

-- Check what columns actually exist
SELECT * FROM profiles LIMIT 5;

-- Create dummy users properly (adjust based on actual table structure)
-- We'll insert directly into profiles table since we know the auth users might exist

INSERT INTO profiles (id, username, created_at, updated_at) VALUES
(gen_random_uuid(), 'emma_chen', NOW(), NOW()),
(gen_random_uuid(), 'alex_rodriguez', NOW(), NOW()),
(gen_random_uuid(), 'maya_patel', NOW(), NOW()),
(gen_random_uuid(), 'jordan_kim', NOW(), NOW()),
(gen_random_uuid(), 'sarah_johnson', NOW(), NOW()),
(gen_random_uuid(), 'beth_williams', NOW(), NOW()),
(gen_random_uuid(), 'marcus_brown', NOW(), NOW()),
(gen_random_uuid(), 'zoe_davis', NOW(), NOW()),
(gen_random_uuid(), 'luke_wilson', NOW(), NOW()),
(gen_random_uuid(), 'aria_martinez', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;