# Admin Access & Dummy Account Management

## 🔐 Admin Access Issue

**Problem**: Toby (toby@lovable.app) may not have admin access or we don't know his password.

### Solution 1: Make Tyler Admin (EASIEST)
```sql
-- Run this in Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE username = 'tyler';
```

### Solution 2: Reset Toby's Password
```javascript
// Run this with your service key
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM4Nzc2NywiZXhwIjoyMDcwOTYzNzY3fQ.zRvZhP5riZffZt-G9H5hHRuJmfZJYBr7cy_TCNFMz-Q'
);

async function setAdminAccess() {
  // Reset Toby's password if he exists
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const toby = users.find(u => u.email === 'toby@lovable.app');
  
  if (toby) {
    await supabase.auth.admin.updateUserById(toby.id, {
      password: 'ArtrioAdmin2025!'
    });
    console.log('Toby password reset to: ArtrioAdmin2025!');
  } else {
    console.log('Toby account not found');
  }
  
  // Make Tyler admin
  const tyler = users.find(u => u.email === 'tylerszakacs@gmail.com');
  if (tyler) {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', tyler.id);
    console.log('Tyler is now admin');
  }
}

setAdminAccess();
```

## 📝 DUMMY ACCOUNTS TO DELETE LATER

### Test Student Accounts (Created Jan 17, 2025)
**ALL USE PASSWORD: ArtrioTest2025!**

1. **jake.thompson.artrio@test.com** (jake_thompson_12) - DUMMY
2. **emma.johnson.artrio@test.com** (emma_johnson_12) - DUMMY  
3. **ethan.rodriguez.artrio@test.com** (ethan_rodriguez_11) - DUMMY
4. **sophia.williams.artrio@test.com** (sophia_williams_11) - DUMMY
5. **mason.chen.artrio@test.com** (mason_chen_10) - DUMMY
6. **olivia.davis.artrio@test.com** (olivia_davis_10) - DUMMY
7. **logan.brooks.artrio@test.com** (logan_brooks_12) - DUMMY [was tyler.brooks]
8. **isabella.garcia.artrio@test.com** (isabella_garcia_12) - DUMMY
9. **dylan.martinez.artrio@test.com** (dylan_martinez_11) - DUMMY
10. **beth.mitchell.artrio@test.com** (beth_mitchell_11) - DUMMY [was ava.mitchell]

### SQL to Delete All Dummy Accounts
```sql
-- Run this when ready to clean up
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users 
    WHERE email LIKE '%artrio@test.com'
  LOOP
    -- Delete profile first
    DELETE FROM profiles WHERE id = user_record.id;
    
    -- Delete from any other tables
    DELETE FROM posts WHERE user_id = user_record.id;
    DELETE FROM trio_members WHERE user_id = user_record.id;
    
    -- Delete auth user (this might need admin API instead)
    DELETE FROM auth.users WHERE id = user_record.id;
  END LOOP;
END $$;
```

### JavaScript to Delete via Admin API
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nqwijkvpzyadpsegvgbm.supabase.co',
  'YOUR_SERVICE_KEY'
);

async function deleteAllDummies() {
  const dummyEmails = [
    'jake.thompson.artrio@test.com',
    'emma.johnson.artrio@test.com',
    'ethan.rodriguez.artrio@test.com',
    'sophia.williams.artrio@test.com',
    'mason.chen.artrio@test.com',
    'olivia.davis.artrio@test.com',
    'logan.brooks.artrio@test.com',
    'isabella.garcia.artrio@test.com',
    'dylan.martinez.artrio@test.com',
    'beth.mitchell.artrio@test.com'
  ];
  
  const { data: { users } } = await supabase.auth.admin.listUsers();
  
  for (const email of dummyEmails) {
    const user = users.find(u => u.email === email);
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
      console.log(`Deleted: ${email}`);
    }
  }
  
  console.log('All dummy accounts deleted!');
}

// deleteAllDummies(); // Uncomment when ready
```

## Real Users (DO NOT DELETE)
- tyler (tylerszakacs@gmail.com) - YOU
- tobyszaks (tobyszaks@gmail.com) - Toby's alt
- t (unknown email) - Unknown user

## Summary
- **10 dummy accounts** created with @test.com emails
- All passwords: **ArtrioTest2025!**
- Can be identified by email pattern: `*artrio@test.com`
- Created: January 17, 2025
- Purpose: TestFlight beta testing