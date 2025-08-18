#!/bin/bash

# Replace console.log/error/warn with logger in all src files
echo "Fixing console statements in src files..."

# Add logger import to files that use console
for file in $(grep -r "console\.\(log\|error\|warn\|debug\)" src --include="*.ts" --include="*.tsx" -l | grep -v "logger.ts"); do
  # Check if logger import already exists
  if ! grep -q "import.*logger" "$file"; then
    # Add logger import after the first import statement
    sed -i '' "0,/^import/s/^import/import { logger } from '@\/utils\/logger';\nimport/" "$file"
  fi
  
  # Replace console statements with logger
  sed -i '' 's/console\.log(/logger.log(/g' "$file"
  sed -i '' 's/console\.error(/logger.error(/g' "$file"
  sed -i '' 's/console\.warn(/logger.warn(/g' "$file"
  sed -i '' 's/console\.debug(/logger.debug(/g' "$file"
done

echo "Console statements fixed!"