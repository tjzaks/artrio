-- Delete Toby's account completely

-- First, remove from any trios (set to NULL where he appears)
UPDATE trios SET user1_id = NULL WHERE user1_id = 'c9258dab-8d81-42b5-92ca-b569e1197138';
UPDATE trios SET user2_id = NULL WHERE user2_id = 'c9258dab-8d81-42b5-92ca-b569e1197138';
UPDATE trios SET user3_id = NULL WHERE user3_id = 'c9258dab-8d81-42b5-92ca-b569e1197138';
UPDATE trios SET user4_id = NULL WHERE user4_id = 'c9258dab-8d81-42b5-92ca-b569e1197138';
UPDATE trios SET user5_id = NULL WHERE user5_id = 'c9258dab-8d81-42b5-92ca-b569e1197138';

-- Delete any posts by Toby
DELETE FROM posts WHERE user_id = '5087fc1d-437a-4c6e-adab-91af6e592c93';

-- Delete any replies by Toby
DELETE FROM replies WHERE user_id = '5087fc1d-437a-4c6e-adab-91af6e592c93';

-- Delete from profiles table
DELETE FROM profiles WHERE id = 'c9258dab-8d81-42b5-92ca-b569e1197138';

-- Note: We cannot delete from auth.users directly via SQL
-- That needs to be done through Supabase Admin API