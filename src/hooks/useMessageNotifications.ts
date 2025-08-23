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
    }, 100); // Reduced to 100ms for faster updates
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
  }, [user]);

  // Listen for changes to notification_counts table AND messages for real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notification-sync-${user.id}`)
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMsg = payload.new as any;
          // Only refresh if message is NOT from current user
          if (newMsg.sender_id !== user.id) {
            // Check if user is in this conversation
            const { data: conv } = await supabase
              .from('conversations')
              .select('user1_id, user2_id')
              .eq('id', newMsg.conversation_id)
              .single();
            
            if (conv && (conv.user1_id === user.id || conv.user2_id === user.id)) {
              // User is recipient - refresh count IMMEDIATELY (no debounce)
              fetchUnreadCount();
            }
          }
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

  // Periodic sync check (every 1 second for near-instant updates)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 1000); // Check every second for near-instant updates
    
    return () => clearInterval(interval);
  }, [user]);

  // Manual refresh function (immediate, no debounce)
  const refreshCount = () => {
    fetchUnreadCount();
  };

  return { unreadCount, refreshCount };
}