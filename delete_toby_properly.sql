-- Delete Toby's account properly

-- First, delete any trios that include Toby
DELETE FROM trios WHERE 
  user1_id = 'c9258dab-8d81-42b5-92ca-b569e1197138' OR
  user2_id = 'c9258dab-8d81-42b5-92ca-b569e1197138' OR
  user3_id = 'c9258dab-8d81-42b5-92ca-b569e1197138' OR
  user4_id = 'c9258dab-8d81-42b5-92ca-b569e1197138' OR
  user5_id = 'c9258dab-8d81-42b5-92ca-b569e1197138';

-- Delete any posts by Toby
DELETE FROM posts WHERE user_id = '5087fc1d-437a-4c6e-adab-91af6e592c93';

-- Delete any replies by Toby
DELETE FROM replies WHERE user_id = '5087fc1d-437a-4c6e-adab-91af6e592c93';

-- Delete from profiles table (this will cascade to other tables due to foreign keys)
DELETE FROM profiles WHERE id = 'c9258dab-8d81-42b5-92ca-b569e1197138';

-- Return confirmation
SELECT 'Toby account deleted' as status;