import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUnreadCount() {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTotalUnread = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_total_unread_count', { p_user_id: user.id });
      
      if (error) {
        console.error('Error fetching total unread count:', error);
        return;
      }
      
      console.log('Total unread count:', data);
      setTotalUnread(data || 0);
    } catch (error) {
      console.error('Error in fetchTotalUnread:', error);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTotalUnread();
      
      // Subscribe to notification_counts changes for real-time updates
      const channel = supabase
        .channel('unread-count-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification_counts',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('Notification counts changed, refreshing total');
            fetchTotalUnread();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user]);

  return {
    totalUnread,
    loading,
    refresh: fetchTotalUnread
  };
}