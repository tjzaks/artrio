-- Seed data for development

-- Create test users
DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  -- Create dev user with admin privileges
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'dev@artrio.local',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "dev_user"}'::jsonb,
    NOW(),
    NOW()
  ) RETURNING id INTO v_user_id;

  -- Update the auto-created profile to be admin
  UPDATE profiles 
  SET is_admin = true 
  WHERE profiles.user_id = v_user_id;

  -- Create regular test users
  FOR i IN 1..3 LOOP
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'user' || i || '@artrio.local',
      crypt('password123', gen_salt('bf')),
      NOW(),
      ('{"username": "user' || i || '"}')::jsonb,
      NOW(),
      NOW()
    );
  END LOOP;

  -- Create bot users (regular users that will act as bots)
  FOR i IN 1..8 LOOP
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'bot' || i || '@artrio.local',
      crypt('password123', gen_salt('bf')),
      NOW(),
      ('{"username": "bot' || i || '"}')::jsonb,
      NOW(),
      NOW()
    );
  END LOOP;
END $$;

-- Output the created users
SELECT 'Test users created:' as message;
SELECT email, raw_user_meta_data->>'username' as username FROM auth.users WHERE email LIKE '%artrio.local' ORDER BY email;