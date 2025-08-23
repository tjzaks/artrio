-- Quick fix script for admin account info issues
-- Run this in your Supabase SQL editor

-- Check current admin functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%admin%';

-- Apply the fix migration
\i supabase/migrations/20240824000000_fix_admin_account_info.sql

-- Test the functions
SELECT 'Testing admin functions...' as status;

-- Show any admin users
SELECT username, is_admin, user_id 
FROM profiles 
WHERE is_admin = true;

-- Check if sensitive_user_data table exists and has data
SELECT COUNT(*) as total_sensitive_records FROM sensitive_user_data;

-- Show first few records for debugging
SELECT user_id, birthday FROM sensitive_user_data LIMIT 5;