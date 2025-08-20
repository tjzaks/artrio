import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMessageNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // SIMPLE: Count unread messages where I'm in the conversation and didn't send them
  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      // Step 1: Get my conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (!conversations || conversations.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Step 2: Count unread messages in those conversations
      const conversationIds = conversations.map(c => c.id);
      
      // Get the actual messages to debug
      const { data: unreadMessages, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);
      
      console.log('[Notifications] Debug:', {
        userId: user.id,
        conversationCount: conversations.length,
        conversationIds,
        unreadCount: count || 0,
        unreadMessages: unreadMessages || []
      });
      
      setUnreadCount(count || 0);
      
    } catch (error) {
      console.error('[Notifications] Error:', error);
      setUnreadCount(0);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
  }, [user]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only care about messages sent TO me
          if (newMessage.sender_id !== user.id) {
            console.log('[Notifications] New message received, refreshing count');
            fetchUnreadCount();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const updatedMessage = payload.new as any;
          
          // If a message was marked as read, refresh count
          if (updatedMessage.is_read) {
            console.log('[Notifications] Message marked as read, refreshing count');
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Manual refresh function
  const refreshCount = () => {
    fetchUnreadCount();
  };

  return { unreadCount, refreshCount };
}