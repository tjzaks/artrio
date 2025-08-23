# How to Add Dummy Users to Artrio

## Option 1: Direct SQL Insert (EASIEST)

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard/project/wojakjbyqclydhcgtvga
   
2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   
3. **Run this SQL to create users:**

```sql
-- Create auth users and profiles for dummy accounts
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Jake Thompson
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'jake.thompson.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "jake_thompson_12", "first_name": "Jake", "last_name": "Thompson"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'jake_thompson_12',
    'Jake',
    'Thompson',
    18,
    12,
    'Senior point guard for the varsity basketball team. Love sports, hanging with friends, and gaming when I''m not on the court.',
    ARRAY['Basketball', 'Student Athletics']
  );

  -- Emma Johnson
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'emma.johnson.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "emma_johnson_12", "first_name": "Emma", "last_name": "Johnson"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'emma_johnson_12',
    'Emma',
    'Johnson',
    18,
    12,
    'Volleyball captain and fitness enthusiast. Leading our team to state championships while maintaining that 4.0 GPA!',
    ARRAY['Volleyball Captain', 'Fitness Club']
  );

  -- Ethan Rodriguez
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'ethan.rodriguez.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "ethan_rodriguez_11", "first_name": "Ethan", "last_name": "Rodriguez"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'ethan_rodriguez_11',
    'Ethan',
    'Rodriguez',
    17,
    11,
    'Drama club president and aspiring actor. You''ll find me on stage or practicing improv with friends. Shakespeare is my jam!',
    ARRAY['Drama Club', 'Theater', 'Improv']
  );

  -- Sophia Williams
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'sophia.williams.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "sophia_williams_11", "first_name": "Sophia", "last_name": "Williams"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'sophia_williams_11',
    'Sophia',
    'Williams',
    17,
    11,
    'Debate team champion and future lawyer. I love a good argument (the intellectual kind). Mock trial state finalist!',
    ARRAY['Debate Team', 'Mock Trial']
  );

  -- Mason Chen
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'mason.chen.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "mason_chen_10", "first_name": "Mason", "last_name": "Chen"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'mason_chen_10',
    'Mason',
    'Chen',
    16,
    10,
    'Chess club strategist and robotics team programmer. Building the future one algorithm at a time.',
    ARRAY['Chess Club', 'Math Team', 'Robotics']
  );

  -- Olivia Davis
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'olivia.davis.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "olivia_davis_10", "first_name": "Olivia", "last_name": "Davis"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'olivia_davis_10',
    'Olivia',
    'Davis',
    15,
    10,
    'Art club vice president and digital design enthusiast. My Instagram is basically my portfolio. Always sketching something!',
    ARRAY['Art Club', 'Photography', 'Digital Design']
  );

  -- Tyler Brooks
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'tyler.brooks.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "tyler_brooks_12", "first_name": "Tyler", "last_name": "Brooks"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'tyler_brooks_12',
    'Tyler',
    'Brooks',
    18,
    12,
    'Student body president and Model UN delegate. Working to make our school better for everyone. Future diplomat in training!',
    ARRAY['Student Council', 'Debate', 'Model UN']
  );

  -- Isabella Garcia
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'isabella.garcia.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "isabella_garcia_12", "first_name": "Isabella", "last_name": "Garcia"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'isabella_garcia_12',
    'Isabella',
    'Garcia',
    18,
    12,
    'Yearbook editor-in-chief and aspiring journalist. Capturing memories and telling stories that matter.',
    ARRAY['Yearbook Editor', 'Journalism']
  );

  -- Dylan Martinez
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'dylan.martinez.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "dylan_martinez_11", "first_name": "Dylan", "last_name": "Martinez"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'dylan_martinez_11',
    'Dylan',
    'Martinez',
    17,
    11,
    'Drummer in the school band and jazz ensemble. Music is life! Always down for a jam session.',
    ARRAY['Band', 'Jazz Ensemble', 'Percussion']
  );

  -- Ava Mitchell
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'ava.mitchell.artrio@test.com',
    crypt('ArtrioTest2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"username": "ava_mitchell_11", "first_name": "Ava", "last_name": "Mitchell"}'::jsonb
  ) RETURNING id INTO user_id;
  
  INSERT INTO public.profiles (id, username, first_name, last_name, age, grade, bio, activities)
  VALUES (
    user_id,
    'ava_mitchell_11',
    'Ava',
    'Mitchell',
    16,
    11,
    'Track star and cross country runner. Training for state championships. Early morning runs are my meditation.',
    ARRAY['Track & Field', 'Cross Country']
  );

END $$;

-- Verify users were created
SELECT email, raw_user_meta_data->>'username' as username 
FROM auth.users 
WHERE email LIKE '%artrio@test.com';
```

## Option 2: Use Supabase API (If you have the keys)

1. **Find your API keys:**
   - Go to: https://supabase.com/dashboard/project/wojakjbyqclydhcgtvga/settings/api
   - Copy the `anon` key and `service_role` key

2. **Run the seed script:**
```bash
cd ~/Library/CloudStorage/Dropbox/artrio-claude1

# Edit the file to add your keys
nano seed_accounts.js
# Replace YOUR_SERVICE_KEY with your actual service role key

# Run it
node seed_accounts.js
```

## Option 3: Manual Creation (Through Dashboard)

1. Go to **Authentication → Users** in Supabase
2. Click "Invite User" for each account
3. Use the emails from the list:
   - jake.thompson.artrio@test.com
   - emma.johnson.artrio@test.com
   - ethan.rodriguez.artrio@test.com
   - sophia.williams.artrio@test.com
   - mason.chen.artrio@test.com
   - olivia.davis.artrio@test.com
   - tyler.brooks.artrio@test.com
   - isabella.garcia.artrio@test.com
   - dylan.martinez.artrio@test.com
   - ava.mitchell.artrio@test.com

## All Accounts Use Same Password
`ArtrioTest2025!`

## After Adding Users

Test login with:
- **Username:** jake_thompson_12
- **Password:** ArtrioTest2025!

The users should now appear in your app!