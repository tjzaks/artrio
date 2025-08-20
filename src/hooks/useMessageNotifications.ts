import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMessageNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // BULLETPROOF: Always query fresh from database, no caching
  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      // Single query to get unread count
      // First get conversations, then count unread messages
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (!conversations || conversations.length === 0) {
        console.log('[Notifications] No conversations found');
        setUnreadCount(0);
        return;
      }

      const conversationIds = conversations.map(c => c.id);
      
      // Direct count query - no data fetching, just the count
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);
      
      if (error) {
        console.error('[Notifications] Query error:', error);
        setUnreadCount(0);
        return;
      }
      
      const finalCount = count || 0;
      console.log(`[Notifications] Database says: ${finalCount} unread messages`);
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

  // SIMPLE: Listen for ANY change to messages table and refresh
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notification-sync')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('[Notifications] Messages table changed:', payload.eventType);
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