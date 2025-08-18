import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  // First, let's just try to get any profile
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample profile:', data);
    if (data && data.length > 0) {
      console.log('Available columns:', Object.keys(data[0]));
    }
  }

  // Now look for Toby
  const { data: users, error: searchError } = await supabase
    .from('profiles')
    .select('*')
    .or('username.eq.tobyszaks,username.ilike.%toby%')
    .limit(5);

  if (searchError) {
    console.error('Search error:', searchError);
  } else {
    console.log('\nUsers with "toby" in username:', users);
  }
}

checkSchema();