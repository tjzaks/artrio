# Artrio Project Memory

## SQL File Management Protocol
**IMPORTANT:** After running any SQL file:
1. Move it to `sql_archive/` folder immediately
2. Or delete it if it's a one-time diagnostic
3. Keep the main directory clean - no loose SQL files!

## Common SQL Files to Keep (in sql_archive/)
- `APPLY_PRESENCE_FIX_NOW.sql` - Main presence fix
- `BULLETPROOF_STORY_FIX.sql` - Story posting fix

## Debugging Patterns That Work
- Always add surgical logging before making assumptions
- Check the actual database data first
- Use alerts for immediate visibility on mobile
- Console.log the exact data being received vs rendered

## Known Issues & Solutions
1. **Presence not showing**: Usually RLS policies or realtime disabled
2. **Stories not posting**: Check storage bucket policies
3. **Build not installing**: Clean DerivedData and rebuild

## Tyler's Preferences
- Clean file structure - archive old files
- Surgical debugging over trial and error
- Think through problems systematically
- No unnecessary SQL files cluttering the root