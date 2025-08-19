#!/bin/bash

# Script to apply trio_queue migration to production Supabase

echo "Applying trio_queue migration to production..."

# Read the migration file
MIGRATION_SQL=$(cat supabase/migrations/20240126000000_add_trio_queue.sql)

# You'll need to run this SQL in the Supabase Dashboard SQL Editor
echo "Please go to your Supabase Dashboard:"
echo "1. Navigate to https://supabase.com/dashboard/project/siqmwgeriobtlnkxfeas/sql/new"
echo "2. Copy and paste the following SQL:"
echo "----------------------------------------"
cat supabase/migrations/20240126000000_add_trio_queue.sql
echo "----------------------------------------"
echo "3. Click 'Run' to execute the migration"
echo ""
echo "This will create:"
echo "- trio_queue table for matching users"
echo "- RLS policies for queue access"
echo "- join_trio_queue() function"
echo "- leave_trio_queue() function"
echo "- get_queue_status() function"