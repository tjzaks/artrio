# SQL Archive

## Important Files to Keep

### Core Fixes
- `APPLY_PRESENCE_FIX_NOW.sql` - Main presence system fix (run after Supabase upgrades)
- `BULLETPROOF_STORY_FIX.sql` - Fixes story posting issues

### Diagnostic Tools (can delete after use)
- `DIAGNOSE_*.sql` - Various diagnostic queries
- `CHECK_*.sql` - Quick status checks
- `INVESTIGATE_*.sql` - Deep investigation queries
- `DEBUG_*.sql` - Debug specific issues
- `VERIFY_*.sql` - Verification queries

## Usage
1. Copy SQL file to main directory when needed
2. Run in Supabase SQL Editor
3. Move back to archive or delete
4. Keep main directory clean!

## Quick Commands
```bash
# To use a SQL file
cp sql_archive/APPLY_PRESENCE_FIX_NOW.sql .

# To archive after use
mv *.sql sql_archive/

# To delete old diagnostics
rm sql_archive/DEBUG_*.sql
rm sql_archive/CHECK_*.sql
```