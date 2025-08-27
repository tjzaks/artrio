# Apply This SQL in Supabase Dashboard

Tyler, please:
1. Go to https://supabase.com/dashboard/project/siqmwgeriobtlnkxfeas/sql/new
2. Copy and paste the contents of `BULLETPROOF_STORY_FIX.sql` 
3. Click "Run"

This will:
- Make trio_id optional for stories (but still required for regular posts)
- Set up proper visibility rules (friends always see stories, trio members see today only)
- Add proper indexes for performance
- Clean up all the patches we tried

After applying this, stories will work without needing a trio!