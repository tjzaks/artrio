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
      setUnreadCount(0);
      return;
    }

    try {
      // Use our new get_total_unread_count function
      const { data, error } = await supabase
        .rpc('get_total_unread_count', { p_user_id: user.id });
      
      if (error) {
        console.error('[Notifications] Query error:', error);
        setUnreadCount(0);
        return;
      }
      
      const finalCount = data || 0;
      console.log(`[Notifications] Total unread count: ${finalCount}`);
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

  // Listen for changes to notification_counts table for this user
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notification-sync')
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
      .subscribe();

    console.log('[Notifications] Subscribed to real-time updates');

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