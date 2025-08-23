-- Function to delete a user account and all associated data (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_user_account(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
    target_profile_id UUID;
    deleted_profile_count INT := 0;
    deleted_sensitive_count INT := 0;
    deleted_posts_count INT := 0;
    deleted_messages_count INT := 0;
    deleted_stories_count INT := 0;
    result_message TEXT;
BEGIN
    -- Get the current user (must be admin)
    admin_user_id := auth.uid();
    
    -- Verify the requesting user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = admin_user_id 
        AND is_admin = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Unauthorized: Admin access required'
        );
    END IF;

    -- Get the target user's profile ID
    SELECT id INTO target_profile_id
    FROM profiles
    WHERE user_id = target_user_id;

    IF target_profile_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Prevent admins from deleting other admins
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = target_user_id 
        AND is_admin = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot delete admin accounts'
        );
    END IF;

    -- Delete user data in the correct order (respecting foreign key constraints)
    
    -- Delete story reactions
    DELETE FROM story_reactions WHERE user_id = target_user_id;
    
    -- Delete story views
    DELETE FROM story_views WHERE viewer_id = target_user_id;
    
    -- Delete stories
    DELETE FROM stories WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_stories_count = ROW_COUNT;
    
    -- Delete replies
    DELETE FROM replies WHERE user_id = target_user_id;
    
    -- Delete posts
    DELETE FROM posts WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_posts_count = ROW_COUNT;
    
    -- Delete messages
    DELETE FROM messages WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_messages_count = ROW_COUNT;
    
    -- Delete conversation participants
    DELETE FROM conversation_participants WHERE user_id = target_user_id;
    
    -- Delete friendships
    DELETE FROM friendships WHERE user_id = target_profile_id OR friend_id = target_profile_id;
    
    -- Delete friend requests
    DELETE FROM friend_requests WHERE requester_id = target_user_id OR requested_id = target_user_id;
    
    -- Delete from trio queue
    DELETE FROM trio_queue WHERE user_id = target_user_id;
    
    -- Remove from trios (set user references to NULL instead of deleting trios)
    UPDATE trios SET user1_id = NULL WHERE user1_id = target_profile_id;
    UPDATE trios SET user2_id = NULL WHERE user2_id = target_profile_id;
    UPDATE trios SET user3_id = NULL WHERE user3_id = target_profile_id;
    
    -- Delete moderation actions (both as target and moderator)
    DELETE FROM moderation_actions WHERE target_user_id = target_user_id OR moderator_id = target_user_id;
    
    -- Delete reports
    DELETE FROM reports WHERE reporter_id = target_user_id;
    
    -- Delete sensitive user data
    DELETE FROM sensitive_user_data WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_sensitive_count = ROW_COUNT;
    
    -- Delete profile
    DELETE FROM profiles WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_profile_count = ROW_COUNT;
    
    -- Note: We cannot delete from auth.users as that's managed by Supabase Auth
    -- The auth user will become orphaned but that's expected behavior
    
    -- Create success message
    result_message := format(
        'User account deleted successfully. Removed: %s profile, %s posts, %s messages, %s stories, and associated data.',
        deleted_profile_count,
        deleted_posts_count,
        deleted_messages_count,
        deleted_stories_count
    );
    
    -- Log the admin action
    INSERT INTO admin_logs (
        admin_id,
        action_type,
        target_type,
        target_id,
        description,
        metadata
    ) VALUES (
        admin_user_id,
        'account_deletion',
        'user',
        target_user_id,
        result_message,
        json_build_object(
            'deleted_counts', json_build_object(
                'profile', deleted_profile_count,
                'posts', deleted_posts_count,
                'messages', deleted_messages_count,
                'stories', deleted_stories_count,
                'sensitive_data', deleted_sensitive_count
            )
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'message', result_message,
        'deleted_counts', json_build_object(
            'profile', deleted_profile_count,
            'posts', deleted_posts_count,
            'messages', deleted_messages_count,
            'stories', deleted_stories_count,
            'sensitive_data', deleted_sensitive_count
        )
    );
END;
$$;

-- Grant execute permission to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(UUID) TO authenticated;