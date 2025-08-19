-- Get all users to find yours
-- Look for your username in the results

SELECT 
    p.user_id,
    p.username,
    u.email,
    p.created_at
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
ORDER BY p.created_at DESC
LIMIT 20;