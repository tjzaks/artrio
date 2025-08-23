#!/bin/bash

echo "Applying bulletproof story fix to database..."

# Get the database URL from Railway
DATABASE_URL=$(railway variables -s artrio-backend 2>/dev/null | grep DATABASE_URL | cut -d'=' -f2-)

if [ -z "$DATABASE_URL" ]; then
  echo "Error: Could not get DATABASE_URL from Railway"
  echo "Trying alternate method..."
  
  # Try getting from .env file
  if [ -f .env ]; then
    DATABASE_URL=$(grep DATABASE_URL .env | cut -d'=' -f2-)
  fi
  
  if [ -z "$DATABASE_URL" ]; then
    echo "Please set DATABASE_URL environment variable"
    exit 1
  fi
fi

echo "Connecting to database..."

# Apply the bulletproof fix
psql "$DATABASE_URL" < BULLETPROOF_STORY_FIX.sql

if [ $? -eq 0 ]; then
  echo "✅ Story fix applied successfully!"
  echo "Stories can now be posted without requiring a trio."
else
  echo "❌ Failed to apply fix. Please check the error above."
  exit 1
fi