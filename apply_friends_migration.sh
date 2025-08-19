#!/bin/bash

# Apply friends system migration to production
export PGPASSWORD="Tyler#007001"

psql "postgresql://postgres.siqmwgeriobtlnkxfeas@aws-0-us-west-1.pooler.supabase.com:6543/postgres" < create_friends_system.sql

echo "Friends system migration applied to production"