-- CHECK WHY FRIENDS PRESENCE ISN'T SHOWING

-- 1. Check all your friends and their status
SELECT 
    p.username,
    p.is_online,
    p.last_seen,
    CASE 
        WHEN p.is_online = true THEN '🟢 ONLINE NOW'
        WHEN p.last_seen > NOW() - INTERVAL '1 minute' THEN '🟡 Active <1 min ago'
        ELSE '⚫ OFFLINE'
    END as status
FROM profiles p
WHERE p.username IN ('tobyszaks', 'tszaks', 'Jonny_B_Good')
ORDER BY p.is_online DESC, p.last_seen DESC;

-- 2. Check if the friendships are properly set up
SELECT 
    f.id as friendship_id,
    f.status as friendship_status,
    p1.username as user1,
    p2.username as user2
FROM friendships f
JOIN profiles p1 ON f.user_id = p1.id
JOIN profiles p2 ON f.friend_id = p2.id
WHERE f.status = 'accepted'
AND (p1.username = 'tzaks' OR p2.username = 'tzaks');

-- 3. Test realtime is working
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'FRIENDS PRESENCE TEST';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'If Toby shows ONLINE above but not in app:';
    RAISE NOTICE '1. The Friends page query might be wrong';
    RAISE NOTICE '2. Real-time subscription might not be working';
    RAISE NOTICE '3. Try pull-to-refresh on Friends page';
    RAISE NOTICE '====================================';
END $$;