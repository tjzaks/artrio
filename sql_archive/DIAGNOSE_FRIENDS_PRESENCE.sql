-- SURGICAL DIAGNOSIS OF FRIENDS PRESENCE ISSUE
-- Run each section to understand the data flow

-- ========================================
-- STEP 1: WHO ARE YOU?
-- ========================================
SELECT 
    '=== YOUR PROFILE ===' as step,
    id as profile_id,
    user_id as auth_user_id,
    username,
    is_online,
    last_seen
FROM profiles
WHERE username = 'tzaks';

-- ========================================
-- STEP 2: WHO ARE YOUR FRIENDS?
-- ========================================
SELECT 
    '=== YOUR FRIENDSHIPS ===' as step,
    f.id as friendship_id,
    f.user_id as friend_user_profile_id,
    f.friend_id as friend_profile_id,
    f.status,
    p1.username as user1_name,
    p2.username as user2_name
FROM friendships f
LEFT JOIN profiles p1 ON f.user_id = p1.id  
LEFT JOIN profiles p2 ON f.friend_id = p2.id
WHERE f.status = 'accepted'
AND (p1.username = 'tzaks' OR p2.username = 'tzaks');

-- ========================================
-- STEP 3: WHAT IS YOUR FRIENDS' STATUS?
-- ========================================
SELECT 
    '=== FRIENDS STATUS ===' as step,
    p.id as profile_id,
    p.user_id as auth_user_id,
    p.username,
    p.is_online,
    p.last_seen,
    CASE 
        WHEN p.is_online = true THEN '🟢 ONLINE'
        WHEN p.last_seen > NOW() - INTERVAL '1 minute' THEN '🟡 RECENT'
        ELSE '⚫ OFFLINE'
    END as status
FROM profiles p
WHERE p.username IN ('tobyszaks', 'tszaks', 'Jonny_B_Good')
ORDER BY p.is_online DESC;

-- ========================================
-- STEP 4: EXACT QUERY FRIENDS PAGE USES
-- ========================================
-- This simulates what the Friends page does:
WITH my_profile AS (
    SELECT id FROM profiles WHERE username = 'tzaks'
),
my_friendships AS (
    SELECT 
        CASE 
            WHEN f.user_id = mp.id THEN f.friend_id
            ELSE f.user_id
        END as friend_profile_id
    FROM friendships f
    CROSS JOIN my_profile mp
    WHERE f.status = 'accepted'
    AND (f.user_id = mp.id OR f.friend_id = mp.id)
)
SELECT 
    '=== WHAT FRIENDS PAGE SEES ===' as step,
    p.id,
    p.user_id,
    p.username,
    p.avatar_url,
    p.bio,
    p.is_online,  -- THIS IS THE KEY FIELD!
    p.last_seen
FROM profiles p
WHERE p.id IN (SELECT friend_profile_id FROM my_friendships);

-- ========================================
-- DIAGNOSIS
-- ========================================
DO $$
DECLARE
    v_your_profile_id uuid;
    v_toby_profile_id uuid;
    v_toby_online boolean;
    v_friendship_exists boolean;
BEGIN
    -- Get your profile ID
    SELECT id INTO v_your_profile_id 
    FROM profiles WHERE username = 'tzaks';
    
    -- Get Toby's profile ID and status
    SELECT id, is_online INTO v_toby_profile_id, v_toby_online
    FROM profiles WHERE username = 'tobyszaks';
    
    -- Check if friendship exists
    SELECT EXISTS(
        SELECT 1 FROM friendships 
        WHERE status = 'accepted'
        AND ((user_id = v_your_profile_id AND friend_id = v_toby_profile_id)
        OR (user_id = v_toby_profile_id AND friend_id = v_your_profile_id))
    ) INTO v_friendship_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'DIAGNOSIS RESULTS:';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Your profile ID: %', v_your_profile_id;
    RAISE NOTICE 'Toby profile ID: %', v_toby_profile_id;
    RAISE NOTICE 'Toby is_online: %', v_toby_online;
    RAISE NOTICE 'Friendship exists: %', v_friendship_exists;
    RAISE NOTICE '';
    
    IF v_toby_online = true AND v_friendship_exists = true THEN
        RAISE NOTICE '✅ DATA IS CORRECT IN DATABASE';
        RAISE NOTICE '🔴 PROBLEM IS IN THE APP CODE!';
        RAISE NOTICE '';
        RAISE NOTICE 'The Friends page query is getting wrong data';
        RAISE NOTICE 'or not displaying is_online correctly';
    ELSIF v_toby_online = false THEN
        RAISE NOTICE '⚠️ Toby is marked OFFLINE in database';
        RAISE NOTICE 'His app needs to send presence updates';
    ELSIF v_friendship_exists = false THEN
        RAISE NOTICE '⚠️ No friendship between you and Toby!';
    END IF;
    
    RAISE NOTICE '====================================';
END $$;