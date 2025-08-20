# Database Maintenance Guide for Artrio

## Why Database Cleanup Matters

Yes, databases definitely need cleaning! Here's what accumulates over time:

### Common Database "Junk":
1. **Old test data** - Test users, dummy messages, trial runs
2. **Duplicate functions** - Multiple versions from iterations
3. **Orphaned records** - Data pointing to deleted items  
4. **Temporary tables** - Left over from migrations/tests
5. **Failed migration artifacts** - Partial tables/functions
6. **Backup tables** - Old "_backup", "_old" tables
7. **Unused indexes** - From deleted features

### Signs Your Database Needs Cleaning:
- Slow queries getting slower
- Random "type casting" errors (like you experienced!)
- Database size growing faster than user data
- Confusion about which function version is "real"
- Old test data appearing in production

## What Professional Devs Do

### During Development (Messy Phase):
- Create lots of test functions/tables
- Try different approaches
- Leave old versions around "just in case"
- Generate test data for debugging

### Before Production:
- **Clean sweep** - Remove all test artifacts
- **Migration squash** - Combine many small migrations into clean ones
- **Fresh start** - Sometimes even rebuild from scratch
- **Document everything** - What stays, what goes

### In Production:
- Regular maintenance windows
- Automated cleanup jobs
- Monitor database size/performance
- Archive old data instead of deleting

## Your Current Situation

You're in the "active development" phase where mess accumulates. This is NORMAL! But yes, it's time for a cleanup because:
1. Multiple function versions are confusing Supabase
2. Test data is mixed with real data
3. Old migration attempts are cluttering things

## Recommended Cleanup Strategy

### Quick Win (Do Now):
1. Run Section 1 of `DATABASE_AUDIT_AND_CLEANUP.sql` to see what you have
2. Delete obvious test data (test users, old trios)
3. Drop duplicate functions keeping only the working version
4. Force Supabase to refresh: `NOTIFY pgrst, 'reload schema'`

### Medium Term (This Week):
1. Create a "clean" migration file with only needed functions
2. Document which tables/functions are production-ready
3. Remove all "_old", "_backup", "test_" tables
4. Set up regular cleanup jobs (delete trios > 30 days old)

### Long Term (Before Launch):
1. Fresh database with clean migrations only
2. Proper staging/production separation
3. Automated tests that clean up after themselves
4. Database backup before major changes

## What to Keep vs Delete

### KEEP:
- Core tables: profiles, trios, messages, conversations
- Working functions: randomize_trios, delete_todays_trios
- RLS policies
- Essential triggers
- Real user data

### DELETE:
- Test/temp tables
- Duplicate function versions
- Old migration attempts
- Test users (bob123456789...)
- Trios older than 30 days
- Orphaned messages/conversations

## Best Practices Going Forward

1. **Use transactions** - Wrap risky changes in BEGIN/COMMIT
2. **Name consistently** - Prefix test items with "test_"
3. **Comment your SQL** - Explain what each function does
4. **Version control** - Track all SQL changes in Git
5. **Clean as you go** - Don't let mess accumulate
6. **Backup first** - Before any major cleanup

## Emergency Cleanup (If Things Break)

If the database gets really messy:

```sql
-- 1. Backup everything first!
-- 2. Drop all custom functions
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 3. Re-run your clean migrations
-- 4. Restore real user data from backup
```

## Your Next Steps

1. Run the audit (Section 1 of cleanup script)
2. Delete obvious junk
3. Keep only the latest randomize_trios function
4. Test everything works
5. Document what you kept and why

Remember: A messy development database is normal! The key is knowing when and how to clean it up. You're asking the right questions at the right time.