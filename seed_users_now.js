#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://nqwijkvpzyadpsegvgbm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM4Nzc2NywiZXhwIjoyMDcwOTYzNzY3fQ.zRvZhP5riZffZt-G9H5hHRuJmfZJYBr7cy_TCNFMz-Q';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Student data
const students = [
  {
    firstName: "Jake",
    lastName: "Thompson",
    username: "jake_thompson_12",
    email: "jake.thompson.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 18,
    grade: 12,
    bio: "Senior point guard for the varsity basketball team. Love sports, hanging with friends, and gaming when I'm not on the court.",
    activities: ["Basketball", "Student Athletics"]
  },
  {
    firstName: "Emma",
    lastName: "Johnson",
    username: "emma_johnson_12",
    email: "emma.johnson.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 18,
    grade: 12,
    bio: "Volleyball captain and fitness enthusiast. Leading our team to state championships while maintaining that 4.0 GPA!",
    activities: ["Volleyball Captain", "Fitness Club"]
  },
  {
    firstName: "Ethan",
    lastName: "Rodriguez",
    username: "ethan_rodriguez_11",
    email: "ethan.rodriguez.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 17,
    grade: 11,
    bio: "Drama club president and aspiring actor. You'll find me on stage or practicing improv with friends.",
    activities: ["Drama Club", "Theater", "Improv"]
  },
  {
    firstName: "Sophia",
    lastName: "Williams",
    username: "sophia_williams_11",
    email: "sophia.williams.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 17,
    grade: 11,
    bio: "Debate team champion and future lawyer. I love a good argument (the intellectual kind). Mock trial state finalist!",
    activities: ["Debate Team", "Mock Trial"]
  },
  {
    firstName: "Mason",
    lastName: "Chen",
    username: "mason_chen_10",
    email: "mason.chen.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 16,
    grade: 10,
    bio: "Chess club strategist and robotics team programmer. Building the future one algorithm at a time.",
    activities: ["Chess Club", "Math Team", "Robotics"]
  },
  {
    firstName: "Olivia",
    lastName: "Davis",
    username: "olivia_davis_10",
    email: "olivia.davis.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 15,
    grade: 10,
    bio: "Art club vice president and digital design enthusiast. My Instagram is basically my portfolio.",
    activities: ["Art Club", "Photography", "Digital Design"]
  },
  {
    firstName: "Tyler",
    lastName: "Brooks",
    username: "tyler_brooks_12",
    email: "tyler.brooks.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 18,
    grade: 12,
    bio: "Student body president and Model UN delegate. Working to make our school better for everyone.",
    activities: ["Student Council", "Debate", "Model UN"]
  },
  {
    firstName: "Isabella",
    lastName: "Garcia",
    username: "isabella_garcia_12",
    email: "isabella.garcia.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 18,
    grade: 12,
    bio: "Yearbook editor-in-chief and aspiring journalist. Capturing memories and telling stories that matter.",
    activities: ["Yearbook Editor", "Journalism"]
  },
  {
    firstName: "Dylan",
    lastName: "Martinez",
    username: "dylan_martinez_11",
    email: "dylan.martinez.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 17,
    grade: 11,
    bio: "Drummer in the school band and jazz ensemble. Music is life! Always down for a jam session.",
    activities: ["Band", "Jazz Ensemble", "Percussion"]
  },
  {
    firstName: "Ava",
    lastName: "Mitchell",
    username: "ava_mitchell_11",
    email: "ava.mitchell.artrio@test.com",
    password: "ArtrioTest2025!",
    age: 16,
    grade: 11,
    bio: "Track star and cross country runner. Training for state championships. Early morning runs are my meditation.",
    activities: ["Track & Field", "Cross Country"]
  }
];

async function seedAccounts() {
  console.log('🚀 Starting to seed dummy accounts...\n');
  
  let successCount = 0;
  let failCount = 0;

  for (const student of students) {
    try {
      console.log(`Creating account for ${student.firstName} ${student.lastName}...`);
      
      // Create user using admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: student.email,
        password: student.password,
        email_confirm: true,
        user_metadata: {
          username: student.username,
          first_name: student.firstName,
          last_name: student.lastName,
          age: student.age,
          grade: student.grade
        }
      });

      if (authError) {
        if (authError.message?.includes('already been registered')) {
          console.log(`⚠️  User ${student.email} already exists, skipping...`);
          continue;
        }
        throw authError;
      }

      console.log(`✅ Created auth account for ${student.username}`);
      
      // Create profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            username: student.username,
            first_name: student.firstName,
            last_name: student.lastName,
            age: student.age,
            grade: student.grade,
            bio: student.bio,
            activities: student.activities,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.log(`⚠️  Profile creation warning: ${profileError.message}`);
        } else {
          console.log(`✅ Created profile for ${student.username}`);
        }
      }
      
      successCount++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error creating ${student.firstName} ${student.lastName}:`, error.message);
      failCount++;
    }
  }

  console.log('\n📊 Seeding Complete!');
  console.log(`✅ Successfully created: ${successCount} accounts`);
  console.log(`❌ Failed: ${failCount} accounts`);
  
  // List all test accounts
  console.log('\n📋 Test Accounts Created:');
  console.log('All passwords are: ArtrioTest2025!\n');
  
  const { data: users } = await supabase
    .from('profiles')
    .select('username, first_name, last_name')
    .like('username', '%_1%')
    .order('username');
    
  if (users && users.length > 0) {
    users.forEach(user => {
      console.log(`- ${user.username} (${user.first_name} ${user.last_name})`);
    });
  }
}

// Run the seeding
seedAccounts().catch(console.error);