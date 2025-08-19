# Artrio Production Database Audit

## Tables Required by Code vs What Exists in Production

### MISSING TABLES (Code expects but not in production):
1. **admin_logs** - For admin activity tracking
2. **age_verification_attempts** - For age verification
3. **avatars** - For avatar storage (might be using profiles.avatar_url instead)
4. **error_logs** - For error tracking
5. **messages** - For direct messaging
6. **moderation_actions** - For content moderation
7. **reported_content** - For reporting inappropriate content
8. **sensitive_user_data** - For storing birthdays and personal info
9. **user_blocks** - For blocking users

### EXISTING TABLES IN PRODUCTION:
- notifications ✓
- posts ✓
- profiles ✓
- replies ✓
- trio_queue ✓ (just added)
- trios ✓

### MISSING RPC FUNCTIONS (Code expects but not in production):
1. **cleanup_expired_content** - For cleaning up old content
2. **delete_todays_trios** - For resetting daily trios
3. **get_conversations** - For fetching user conversations
4. **populate_safe_profiles** - For getting safe profile data

### EXISTING RPC FUNCTIONS IN PRODUCTION:
- get_queue_status ✓
- get_user_trio_for_date ✓
- is_user_admin ✓
- join_trio_queue ✓ (just added)
- leave_trio_queue ✓ (just added)
- randomize_trios ✓

## Critical Missing Components for Core Features:

### 1. MESSAGING SYSTEM (Messages.tsx needs these):
- conversations table
- conversation_participants table  
- messages table
- get_conversations() function

### 2. STORIES SYSTEM (for Instagram-like stories):
- stories table
- story_views table
- trio_members table (to properly link users to trios)

### 3. ADMIN & MODERATION:
- admin_logs table
- moderation_actions table
- reported_content table
- user_blocks table

### 4. USER DATA:
- sensitive_user_data table (for birthdays)
- age_verification_attempts table

### 5. ERROR TRACKING:
- error_logs table