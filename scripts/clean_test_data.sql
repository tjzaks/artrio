-- Clean up test data - keep only Tyler, Toby, and Jon

-- First, delete all trios
DELETE FROM public.trios;

-- Delete all test users except the ones we want to keep
DELETE FROM auth.users 
WHERE email NOT IN (
  'tyler@artrio.local',
  'toby@artrio.local', 
  'jon@artrio.local',
  'admin@artrio.local'
);

-- Clean up orphaned profiles
DELETE FROM public.profiles
WHERE user_id NOT IN (
  SELECT id FROM auth.users
);

-- Clear the queue if it exists
DELETE FROM public.trio_queue;

-- Verify remaining users
SELECT 
  u.email,
  p.username,
  p.display_name,
  p.is_admin
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
ORDER BY u.created_at;