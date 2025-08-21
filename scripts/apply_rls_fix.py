#!/usr/bin/env python3
"""
Apply RLS fix for stories/posts upload issue
Run this if Supabase SQL Editor has connection issues
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: Missing Supabase credentials")
    print("Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file")
    exit(1)

# Read the SQL file
with open('FIX_STORIES_UPLOAD_RLS.sql', 'r') as f:
    sql_content = f.read()

# Split into individual statements (separated by semicolons)
statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]

print(f"📝 Found {len(statements)} SQL statements to execute")

# Execute each statement
successful = 0
failed = 0

for i, statement in enumerate(statements, 1):
    # Skip pure comment blocks
    if statement.startswith('--'):
        continue
        
    print(f"\n[{i}/{len(statements)}] Executing statement...")
    print(f"  {statement[:50]}..." if len(statement) > 50 else f"  {statement}")
    
    # Make API request to Supabase
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/query",
        headers={
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        json={'query': statement + ';'}
    )
    
    if response.status_code in [200, 201, 204]:
        print("  ✅ Success")
        successful += 1
    else:
        print(f"  ❌ Failed: {response.status_code}")
        print(f"     {response.text}")
        failed += 1

print(f"\n📊 Results: {successful} successful, {failed} failed")

if failed == 0:
    print("🎉 All RLS policies have been fixed! Users should now be able to upload stories/posts.")
else:
    print("⚠️  Some statements failed. You may need to run them manually in Supabase SQL Editor.")