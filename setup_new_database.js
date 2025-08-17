import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey);

async function setupDatabase() {
  console.log('🚀 Setting up fresh Artrio database...\n');

  // Step 1: Create tables
  console.log('📊 Creating tables...');
  const { error: schemaError } = await supabase.rpc('execute_sql', {
    sql: `
      -- Create profiles table
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create trios table
      CREATE TABLE IF NOT EXISTS trios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        user3_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        user4_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        user5_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, user1_id),
        UNIQUE(date, user2_id),
        UNIQUE(date, user3_id)
      );

      -- Create posts table
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        trio_id UUID REFERENCES trios(id) ON DELETE CASCADE NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create replies table
      CREATE TABLE IF NOT EXISTS replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_trios_date ON trios(date);
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_trio_id ON posts(trio_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `
  });

  if (schemaError) {
    console.error('❌ Schema creation error:', schemaError);
    return;
  }
  console.log('✅ Tables created successfully!\n');

  // Step 2: Create helper functions
  console.log('🔧 Creating helper functions...');
  const { error: functionsError } = await supabase.rpc('execute_sql', {
    sql: `
      -- Function to get user's trio (works around PostgREST OR bug)
      CREATE OR REPLACE FUNCTION get_user_trio_for_date(
        auth_user_id UUID,
        target_date DATE DEFAULT CURRENT_DATE
      )
      RETURNS TABLE (
        id UUID,
        user1_id UUID,
        user2_id UUID,
        user3_id UUID,
        date DATE,
        created_at TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        profile_id UUID;
      BEGIN
        -- Get profile ID from auth user ID
        SELECT p.id INTO profile_id
        FROM profiles p
        WHERE p.user_id = auth_user_id;
        
        -- Return the trio for this profile
        RETURN QUERY
        SELECT t.id, t.user1_id, t.user2_id, t.user3_id, t.date, t.created_at
        FROM trios t
        WHERE t.date = target_date
          AND (t.user1_id = profile_id 
            OR t.user2_id = profile_id 
            OR t.user3_id = profile_id);
      END;
      $$;

      -- Function to create daily trios
      CREATE OR REPLACE FUNCTION randomize_trios()
      RETURNS JSON
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSON;
        trio_count INT := 0;
      BEGIN
        -- Delete existing trios for today
        DELETE FROM trios WHERE date = CURRENT_DATE;
        
        -- Create new trios (groups of 3)
        WITH shuffled_users AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
          FROM profiles
          WHERE id IS NOT NULL
        ),
        grouped_users AS (
          SELECT 
            id,
            ((rn - 1) / 3) + 1 as trio_group,
            ((rn - 1) % 3) + 1 as position_in_trio
          FROM shuffled_users
        )
        INSERT INTO trios (user1_id, user2_id, user3_id, date)
        SELECT 
          MAX(CASE WHEN position_in_trio = 1 THEN id END),
          MAX(CASE WHEN position_in_trio = 2 THEN id END),
          MAX(CASE WHEN position_in_trio = 3 THEN id END),
          CURRENT_DATE
        FROM grouped_users
        GROUP BY trio_group
        HAVING COUNT(*) >= 3;
        
        -- Get count
        SELECT COUNT(*) INTO trio_count FROM trios WHERE date = CURRENT_DATE;
        
        -- Return result
        RETURN json_build_object(
          'success', true,
          'trios_created', trio_count,
          'date', CURRENT_DATE
        );
      END;
      $$;

      -- Function to check admin status
      CREATE OR REPLACE FUNCTION is_user_admin(auth_user_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        admin_status BOOLEAN;
      BEGIN
        SELECT is_admin INTO admin_status
        FROM profiles
        WHERE user_id = auth_user_id;
        
        RETURN COALESCE(admin_status, false);
      END;
      $$;

      -- Trigger to auto-create profile on signup
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        INSERT INTO public.profiles (user_id, username)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        RETURN NEW;
      END;
      $$;

      -- Create trigger
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION handle_new_user();
    `
  });

  if (functionsError) {
    console.error('❌ Functions creation error:', functionsError);
    return;
  }
  console.log('✅ Functions created successfully!\n');

  // Step 3: Set up RLS policies
  console.log('🔒 Setting up RLS policies...');
  const { error: rlsError } = await supabase.rpc('execute_sql', {
    sql: `
      -- Enable RLS
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE trios ENABLE ROW LEVEL SECURITY;
      ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

      -- Profiles policies
      CREATE POLICY "Public profiles" ON profiles
        FOR SELECT USING (true);
      
      CREATE POLICY "Users can update own profile" ON profiles
        FOR UPDATE USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can insert own profile" ON profiles
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      -- Trios policies
      CREATE POLICY "Anyone can read trios" ON trios
        FOR SELECT USING (true);
      
      CREATE POLICY "System can manage trios" ON trios
        FOR ALL USING (true) WITH CHECK (true);

      -- Posts policies
      CREATE POLICY "Anyone can read posts" ON posts
        FOR SELECT USING (true);
      
      CREATE POLICY "Users can create posts" ON posts
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can update own posts" ON posts
        FOR UPDATE USING (auth.uid() = user_id);

      -- Replies policies
      CREATE POLICY "Anyone can read replies" ON replies
        FOR SELECT USING (true);
      
      CREATE POLICY "Users can create replies" ON replies
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      -- Notifications policies
      CREATE POLICY "Users can read own notifications" ON notifications
        FOR SELECT USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can update own notifications" ON notifications
        FOR UPDATE USING (auth.uid() = user_id);

      -- Grant permissions
      GRANT EXECUTE ON FUNCTION get_user_trio_for_date TO authenticated;
      GRANT EXECUTE ON FUNCTION randomize_trios TO authenticated;
      GRANT EXECUTE ON FUNCTION is_user_admin TO authenticated;
    `
  });

  if (rlsError) {
    console.error('❌ RLS setup error:', rlsError);
    return;
  }
  console.log('✅ RLS policies created successfully!\n');

  console.log('🎉 Database setup complete! Next steps:');
  console.log('1. Run: node import_users.js');
  console.log('2. Restart your dev server');
  console.log('3. Test login with Tyler account');
}

setupDatabase().catch(console.error);