-- CHECK TOBY'S CURRENT PRESENCE STATUS

-- Check Toby's presence
SELECT 
    username,
    is_online,
    last_seen,
    CASE 
        WHEN is_online = true THEN '🟢 ONLINE'
        WHEN last_seen > NOW() - INTERVAL '30 seconds' THEN '🟡 Recently active'
        ELSE '⚫ OFFLINE'
    END as status,
    ROUND(EXTRACT(EPOCH FROM (NOW() - last_seen)), 0) as seconds_since_update
FROM profiles
WHERE username IN ('tobyszaks', 'tszaks', 'tzaks')
ORDER BY last_seen DESC;

-- Check if presence is updating at all
SELECT 
    '=== PRESENCE UPDATE CHECK ===' as info;

SELECT 
    COUNT(*) as users_online_now,
    COUNT(CASE WHEN last_seen > NOW() - INTERVAL '1 minute' THEN 1 END) as active_last_minute,
    COUNT(CASE WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 1 END) as active_last_5min
FROM profiles;

-- Force Toby online (for testing)
UPDATE profiles 
SET is_online = true, last_seen = NOW()
WHERE username = 'tobyszaks'
RETURNING username, is_online, last_seen;