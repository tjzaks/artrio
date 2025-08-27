#!/bin/bash

# Apply admin migrations to production

echo "Applying phone storage migration..."
npx supabase db push --file supabase/migrations/20250827000000_fix_phone_storage.sql

echo "Applying admin function migration..."
npx supabase db push --file supabase/migrations/20250827000001_admin_get_all_user_data.sql

echo "Done! Admin functions should now work."