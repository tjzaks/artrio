-- Let's check EXACTLY what's in auth.users vs profiles

-- 1. Show ALL auth.users (these are the REAL users who can log in)
SELECT 
  id as auth_user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at;

-- 2. Show ALL profiles
SELECT 
  user_id as profile_user_id,
  username,
  created_at
FROM profiles
ORDER BY created_at;

-- 3. CRITICAL CHECK: Which profiles have matching auth.users?
SELECT 
  p.username,
  p.user_id as profile_id,
  au.id as auth_id,
  au.email,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ VALID - Can log in'
    ELSE '❌ INVALID - Cannot log in, DELETE THIS'
  END as status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
ORDER BY status DESC, p.username;

-- 4. Which auth.users have NO profile? (These need profiles created)
SELECT 
  au.id as auth_id,
  au.email,
  p.username,
  CASE 
    WHEN p.user_id IS NULL THEN '⚠️ AUTH USER WITHOUT PROFILE'
    ELSE '✅ Has profile'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
ORDER BY status, au.email;

-- 5. The REAL users who can actually use the app
SELECT 
  au.id as user_id,
  au.email,
  p.username,
  'CAN USE APP' as status
FROM auth.users au
INNER JOIN profiles p ON p.user_id = au.id;

-- 6. Profiles that should be DELETED (no auth user)
SELECT 
  'DELETE FROM profiles WHERE user_id = ''' || p.user_id || ''';' as delete_command,
  p.username as orphaned_username
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id);