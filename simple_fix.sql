-- SIMPLE FIX - Just make it work

-- 1. Clear today's trios and start fresh
DELETE FROM trios WHERE date = CURRENT_DATE;

-- 2. Create 4 trios for today with our 13 users
INSERT INTO trios (user1_id, user2_id, user3_id, date) VALUES
-- Trio 1: Tyler, Jonny B, jake
('f1fc4b18-731e-4768-83f7-5ac90e42e037', 'a2c43611-6354-437f-a2e9-31b3589e4adc', 'a9cef255-6237-4c1a-9f8b-f4a7e027a66b', CURRENT_DATE),
-- Trio 2: emma, ethan, sophia
('44416b2e-66ee-46d9-abb7-83c8ea16d10e', '248a7831-f4dd-449d-81f0-bd2ba0fe30bd', '6d6a21f6-6be3-4237-954a-66ccc9804168', CURRENT_DATE),
-- Trio 3: mason, olivia, logan
('7b772cb3-15da-4061-b4c9-40d0309ed11d', '6395fdff-41f2-492f-b336-13ddcad10212', '5f734858-9675-4159-bbd3-812224be2d1c', CURRENT_DATE),
-- Trio 4: isabella, dylan, beth
('967a8da4-e3b8-4269-98d8-5eabfd05f1cb', '8ae10aec-2888-4f30-85bc-690ecb49e85b', 'a1958415-6efc-405c-aff9-47ed27983a25', CURRENT_DATE);

-- 3. Simple function to get user's trio (works around PostgREST bug)
CREATE OR REPLACE FUNCTION get_my_trio(auth_id UUID)
RETURNS TABLE(trio_id UUID, user1 UUID, user2 UUID, user3 UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT t.id, t.user1_id, t.user2_id, t.user3_id
  FROM trios t
  JOIN profiles p ON p.user_id = auth_id
  WHERE t.date = CURRENT_DATE
    AND (t.user1_id = p.id OR t.user2_id = p.id OR t.user3_id = p.id);
$$;

-- 4. Make sure everyone can read trios
DROP POLICY IF EXISTS "Anyone can read trios" ON trios;
CREATE POLICY "Anyone can read trios" ON trios FOR SELECT USING (true);

-- Done! That's it.