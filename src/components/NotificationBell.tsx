import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, X, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    setupRealtimeSubscription();
  }, [user]);

  useEffect(() => {
    const count = notifications.filter(n => !n.is_read).length;
    setUnreadCount(count);
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          logger.log('New notification received:', payload);
          const newNotification = payload.new as Notification;
          
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast for new notifications
          if (newNotification.type === 'trio_formed' || newNotification.type === 'group_formed') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'trio_formed':
      case 'group_formed': // Backward compatibility
        return <Users className="h-4 w-4" />;
      case 'trio_reminder':
      case 'group_reminder': // Backward compatibility
        return <Calendar className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'trio_formed':
      case 'group_formed': // Backward compatibility
        return 'default';
      case 'trio_reminder':
      case 'group_reminder': // Backward compatibility
        return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-primary/10 rounded-full transition-all duration-200"
      >
        <Bell className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary animate-pulse shadow-sm shadow-primary/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 z-50 shadow-2xl bg-background border-2 rounded-3xl overflow-hidden transition-all duration-300 ease-out animate-in slide-in-from-top-2">
          <CardContent className="p-0 bg-background">
            <div className="flex items-center justify-between p-4 border-b-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm">
              <h3 className="font-semibold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs hover:bg-primary/10 rounded-full transition-all duration-200"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-primary/10 rounded-full transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-3 p-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="relative inline-block">
                      <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-muted-foreground/20 rounded-full animate-pulse" />
                    </div>
                    <p className="text-muted-foreground/70 font-medium">No notifications yet</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">We'll let you know when something happens!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                        !notification.is_read ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-sm' : 'hover:bg-muted/30 border-transparent hover:border-muted-foreground/10'
                      }`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 ${
                            notification.type === 'trio_formed' || notification.type === 'group_formed'
                              ? 'bg-gradient-to-br from-primary/20 to-primary/10'
                              : 'bg-gradient-to-br from-secondary/20 to-secondary/10'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{notification.title}</p>
                            {!notification.is_read && (
                              <div className="h-2 w-2 bg-primary rounded-full animate-pulse shadow-sm shadow-primary/50" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}