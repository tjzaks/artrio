-- Fix the trio table foreign key constraints to reference profiles table, not auth.users

-- Drop existing foreign key constraints
ALTER TABLE trios DROP CONSTRAINT IF EXISTS trios_user1_id_fkey;
ALTER TABLE trios DROP CONSTRAINT IF EXISTS trios_user2_id_fkey;
ALTER TABLE trios DROP CONSTRAINT IF EXISTS trios_user3_id_fkey;
ALTER TABLE trios DROP CONSTRAINT IF EXISTS trios_user4_id_fkey;
ALTER TABLE trios DROP CONSTRAINT IF EXISTS trios_user5_id_fkey;

-- Add new foreign key constraints referencing profiles table
ALTER TABLE trios 
  ADD CONSTRAINT trios_user1_id_fkey 
  FOREIGN KEY (user1_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE trios 
  ADD CONSTRAINT trios_user2_id_fkey 
  FOREIGN KEY (user2_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE trios 
  ADD CONSTRAINT trios_user3_id_fkey 
  FOREIGN KEY (user3_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE trios 
  ADD CONSTRAINT trios_user4_id_fkey 
  FOREIGN KEY (user4_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE trios 
  ADD CONSTRAINT trios_user5_id_fkey 
  FOREIGN KEY (user5_id) REFERENCES profiles(id) ON DELETE CASCADE;