import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI';

const supabase = createClient(supabaseUrl, serviceKey);

async function finalizeSetup() {
  console.log('🔧 Finalizing Artrio setup...\n');

  // 1. Make Tyler admin
  console.log('👑 Making Tyler admin...');
  const { error: adminError } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('username', 'tyler');
  
  if (!adminError) console.log('✅ Tyler is now admin!');

  // 2. Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at');

  console.log(`\n📊 Found ${profiles.length} profiles`);

  // 3. Create trios for today
  console.log('\n🎲 Creating trios for today...');
  
  const shuffled = [...profiles].sort(() => Math.random() - 0.5);
  const trios = [];
  
  // Create groups of 3
  for (let i = 0; i < shuffled.length - 2; i += 3) {
    trios.push({
      user1_id: shuffled[i].id,
      user2_id: shuffled[i + 1].id,
      user3_id: shuffled[i + 2].id,
      date: new Date().toISOString().split('T')[0]
    });
  }

  const { data: triosData, error: triosError } = await supabase
    .from('trios')
    .insert(trios)
    .select();

  if (triosError) {
    console.error('❌ Error creating trios:', triosError);
  } else {
    console.log(`✅ Created ${triosData.length} trios!\n`);
    
    // Show trios
    for (let i = 0; i < triosData.length; i++) {
      const trio = triosData[i];
      const user1 = profiles.find(p => p.id === trio.user1_id);
      const user2 = profiles.find(p => p.id === trio.user2_id);
      const user3 = profiles.find(p => p.id === trio.user3_id);
      console.log(`  Trio ${i + 1}: ${user1?.username}, ${user2?.username}, ${user3?.username}`);
    }
  }

  console.log('\n🎉 Setup complete! System is ready.');
  console.log('\n📝 Login with:');
  console.log('  Tyler: szakacsmediacompany@gmail.com / Claude&Cursor4Life!');
  console.log('  Jonny B: jonnyb@example.com / test123456');
}

finalizeSetup().catch(console.error);