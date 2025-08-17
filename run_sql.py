#!/usr/bin/env python3

import os
import sys
import json
from supabase import create_client, Client
import psycopg2
from psycopg2.extras import RealDictCursor

# Supabase credentials
SUPABASE_URL = "https://nqwijkvpzyadpsegvgbm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.7QDR-iANA7YS5c9NUJWDMLj9AkoBDPrs6Heq-LeAepg"

# Database connection string - get from Supabase dashboard > Settings > Database
DATABASE_URL = "postgresql://postgres.nqwijkvpzyadpsegvgbm:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

def run_sql_direct(sql):
    """Execute SQL directly using psycopg2"""
    try:
        # You'll need to get the database password from Supabase dashboard
        # Go to Settings > Database > Connection string
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute(sql)
        
        # If it's a SELECT query, fetch results
        if sql.strip().upper().startswith('SELECT'):
            results = cur.fetchall()
            print(json.dumps(results, indent=2, default=str))
        else:
            conn.commit()
            print(f"Query executed successfully. Rows affected: {cur.rowcount}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

def run_sql_via_supabase(sql):
    """Execute SQL using Supabase client"""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # For testing, let's just check trios
        if "trios" in sql.lower():
            result = supabase.table('trios').select("*").execute()
            print(json.dumps(result.data, indent=2, default=str))
        else:
            print("Note: Direct SQL execution requires setting up a custom RPC function in Supabase")
            print(f"SQL to run: {sql}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_sql.py \"YOUR SQL QUERY\"")
        sys.exit(1)
    
    sql = " ".join(sys.argv[1:])
    print(f"Executing: {sql}\n")
    
    # Try Supabase method first
    run_sql_via_supabase(sql)