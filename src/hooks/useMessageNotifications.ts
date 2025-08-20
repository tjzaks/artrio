import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMessageNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Use the new notification_counts system
  const fetchUnreadCount = async () => {
    if (!user) {
      console.log('🚨 [Notifications] No user, setting count to 0');
      setUnreadCount(0);
      return;
    }

    console.log('🚨 [Notifications] FETCHING UNREAD COUNT for user:', user.id);

    try {
      // Use our new get_total_unread_count function
      const { data, error } = await supabase
        .rpc('get_total_unread_count', { p_user_id: user.id });
      
      if (error) {
        console.error('🚨 [Notifications] Query error:', error);
        setUnreadCount(0);
        return;
      }
      
      const finalCount = data || 0;
      console.log(`🚨 [Notifications] FETCHED COUNT: ${finalCount} - SETTING STATE!`);
      setUnreadCount(finalCount);
      
    } catch (error) {
      console.error('[Notifications] Error:', error);
      setUnreadCount(0);
    }
  };
  
  // Debounced refresh to prevent too many queries
  const debouncedRefresh = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      console.log('[Notifications] Debounced refresh triggered');
      fetchUnreadCount();
    }, 500); // Wait 500ms after last change
  };

  // Initial fetch
  useEffect(() => {
    console.log('[Notifications] User changed, fetching count');
    fetchUnreadCount();
  }, [user]);

  // Listen for changes to notification_counts table AND new messages for this user
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notification-sync-global')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notification_counts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Notifications] Notification counts changed:', payload.eventType);
          // Don't try to be smart - just refresh from DB
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as any;
          console.log('🚨 [Notifications] NEW MESSAGE DETECTED GLOBALLY:', newMsg);
          console.log('🚨 [Notifications] Current user ID:', user.id);
          console.log('🚨 [Notifications] Message sender ID:', newMsg.sender_id);
          console.log('🚨 [Notifications] Conversation ID:', newMsg.conversation_id);
          
          // Check if this message affects this user (they're in the conversation)
          supabase
            .from('conversations')
            .select('user1_id, user2_id')
            .eq('id', newMsg.conversation_id)
            .single()
            .then(({ data: conv }) => {
              console.log('🚨 [Notifications] Conversation data:', conv);
              if (conv && (conv.user1_id === user.id || conv.user2_id === user.id) && newMsg.sender_id !== user.id) {
                console.log('🚨 [Notifications] MESSAGE AFFECTS THIS USER! REFRESHING COUNT!');
                debouncedRefresh();
              } else {
                console.log('🚨 [Notifications] Message does not affect this user');
              }
            })
            .catch((error) => {
              console.error('🚨 [Notifications] Error checking conversation:', error);
            });
        }
      )
      .subscribe((status) => {
        console.log('🚨 [Notifications] SUBSCRIPTION STATUS:', status);
        if (status === 'SUBSCRIBED') {
          console.log('🚨 [Notifications] SUCCESSFULLY SUBSCRIBED TO GLOBAL MESSAGES!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('🚨 [Notifications] SUBSCRIPTION FAILED!');
        }
      });

    console.log('🚨 [Notifications] Setting up global subscription...');

    return () => {
      console.log('[Notifications] Unsubscribing from real-time updates');
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [user]);

  // Periodic sync check (every 30 seconds)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      console.log('[Notifications] Periodic sync check');
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Manual refresh function (immediate, no debounce)
  const refreshCount = () => {
    console.log('[Notifications] Manual refresh requested');
    fetchUnreadCount();
  };

  return { unreadCount, refreshCount };
}