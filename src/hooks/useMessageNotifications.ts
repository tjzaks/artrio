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
        setUnreadCount(0);
        return;
      }
      
      const finalCount = data || 0;
      setUnreadCount(finalCount);
      
    } catch (error) {
      setUnreadCount(0);
    }
  };
  
  // Debounced refresh to prevent too many queries
  const debouncedRefresh = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchUnreadCount();
    }, 500); // Wait 500ms after last change
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
  }, [user]);

  // Listen for changes to notification_counts table for real-time updates
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
          // Notification counts changed for this user - refresh the badge
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
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
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Manual refresh function (immediate, no debounce)
  const refreshCount = () => {
    fetchUnreadCount();
  };

  return { unreadCount, refreshCount };
}