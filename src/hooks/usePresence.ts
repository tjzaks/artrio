import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatLastSeen, isCurrentlyActive } from '@/utils/timeUtils';

interface PresenceState {
  [userId: string]: {
    isOnline: boolean;
    lastSeen: string;
  };
}

export function usePresence() {
  const { user } = useAuth();
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<{ [userId: string]: number }>({});

  // Set up database subscription for presence updates
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to profiles table changes for is_online updates
    const profilesSubscription = supabase
      .channel('profiles-presence-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          // NO FILTER - we need to see ALL updates including our own
        },
        (payload) => {
          if (payload.new && (payload.new as any).user_id) {
            const userId = (payload.new as any).user_id;
            const isOnline = (payload.new as any).is_online;
            const lastSeen = (payload.new as any).last_seen;
            
            // Check if this is a recent update (within 30 seconds)
            const lastSeenTime = new Date(lastSeen).getTime();
            const now = new Date().getTime();
            const timeDiff = now - lastSeenTime;
            const isActuallyOnline = isOnline && timeDiff < 30000;
            
            console.log(`[PRESENCE-DB-CHANGE] User ${userId}: online=${isOnline}, actually_online=${isActuallyOnline} (${Math.round(timeDiff/1000)}s ago)`);
            
            // Update local state with database change
            setPresenceState(prev => ({
              ...prev,
              [userId]: {
                isOnline: isActuallyOnline,
                lastSeen: lastSeen || new Date().toISOString()
              }
            }));
            
            // Clear fetch time so we don't re-fetch immediately
            setLastFetchTime(prev => ({ ...prev, [userId]: Date.now() }));
          }
        }
      )
      .subscribe((status) => {
        console.log('[PRESENCE-DB-SUBSCRIPTION] Status:', status);
      });
    
    return () => {
      supabase.removeChannel(profilesSubscription);
    };
  }, [user]);
  
  useEffect(() => {
    if (!user) return;

    // Update user's own presence in database
    const updateOwnPresence = async (isOnline: boolean) => {
      console.log(`[PRESENCE-DEBUG] Attempting to update presence for ${user.id} to ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            is_online: isOnline,
            last_seen: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) {
          console.error('[PRESENCE-ERROR] Database update failed:', {
            error,
            userId: user.id,
            attempted: isOnline
          });
          setIsConnected(false);
          // Update our own state to reflect disconnection
          setPresenceState(prev => ({
            ...prev,
            [user.id]: {
              isOnline: false,
              lastSeen: new Date().toISOString()
            }
          }));
        } else {
          console.log(`[PRESENCE-SUCCESS] Updated ${user.id}:`, {
            isOnline: data?.is_online,
            lastSeen: data?.last_seen,
            username: data?.username
          });
          setIsConnected(isOnline);
          // Update our own state immediately
          setPresenceState(prev => ({
            ...prev,
            [user.id]: {
              isOnline: isOnline,
              lastSeen: new Date().toISOString()
            }
          }));
        }
      } catch (error) {
        console.error('Error updating presence:', error);
        setIsConnected(false);
        // Update state to show disconnection
        setPresenceState(prev => ({
          ...prev,
          [user.id]: {
            isOnline: false,
            lastSeen: new Date().toISOString()
          }
        }));
      }
    };

    // Set user as online
    updateOwnPresence(true);

    // Create presence channel - use a shared channel name for all users
    const presenceChannel = supabase.channel('presence:global', {
      config: {
        presence: {
          key: user.id,
        },
        broadcast: {
          self: false, // Don't receive own broadcasts
        },
      },
    });

    // Track presence state
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('[PRESENCE-SYNC] Current online users:', Object.keys(state));
        const newPresenceState: PresenceState = {};
        
        Object.keys(state).forEach((userId) => {
          console.log(`[PRESENCE-SYNC] User ${userId} is ONLINE via WebSocket`);
          newPresenceState[userId] = {
            isOnline: true,
            lastSeen: new Date().toISOString(),
          };
        });
        
        setPresenceState(newPresenceState);
        
        // Also update database for these online users
        Object.keys(state).forEach(async (userId) => {
          if (userId !== user.id) {
            // Update other users' presence in our local state from DB
            await fetchUserPresence(userId);
          }
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`[PRESENCE] User ${key} joined:`, newPresences);
        setPresenceState((prev) => ({
          ...prev,
          [key]: {
            isOnline: true,
            lastSeen: new Date().toISOString(),
          },
        }));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`[PRESENCE] User ${key} left:`, leftPresences);
        setPresenceState((prev) => ({
          ...prev,
          [key]: {
            isOnline: false,
            lastSeen: new Date().toISOString(), // Store when they went offline
          },
        }));
      })
      .subscribe(async (status) => {
        console.log(`[PRESENCE-CHANNEL] Subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Send user's presence
          const trackData = {
            online_at: new Date().toISOString(),
            user_id: user.id,
            username: user.email?.split('@')[0] || 'Unknown',
          };
          console.log('[PRESENCE-TRACK] Sending presence:', trackData);
          await presenceChannel.track(trackData);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.log('[PRESENCE-CHANNEL] Lost connection:', status);
          setIsConnected(false);
        }
      });

    setChannel(presenceChannel);

    // Send heartbeat every 10 seconds to maintain presence (more frequent for better accuracy)
    const heartbeatInterval = setInterval(() => {
      console.log('[PRESENCE-HEARTBEAT] Sending heartbeat...');
      updateOwnPresence(true);
      if (presenceChannel) {
        presenceChannel.track({
          online_at: new Date().toISOString(),
          user_id: user.id,
          username: user.email?.split('@')[0] || 'Unknown',
        });
      }
    }, 10000); // Changed from 30s to 10s for better responsiveness

    // Handle page visibility changes - but DON'T set offline for tab switches
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to the tab - update presence to ensure we're marked online
        updateOwnPresence(true);
      }
      // Don't set offline when switching tabs - only on actual page unload
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle actual page close/navigation
    const handleBeforeUnload = () => {
      updateOwnPresence(false);
    };
    
    // Monitor network connectivity
    const handleOnline = () => {
      console.log('[PRESENCE] Network online - reconnecting...');
      updateOwnPresence(true);
    };
    
    const handleOffline = () => {
      console.log('[PRESENCE] Network offline - disconnected');
      setIsConnected(false);
      setPresenceState(prev => ({
        ...prev,
        [user.id]: {
          isOnline: false,
          lastSeen: new Date().toISOString()
        }
      }));
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Set user as offline
      updateOwnPresence(false);
      
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [user]);

  // Fetch presence data from database for a user
  const fetchUserPresence = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_online, last_seen, username')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('[PRESENCE-FETCH] Error for', userId, error);
        return;
      }
      
      if (data) {
        // Check if last_seen is recent (within 30 seconds) to determine if really online
        const lastSeenTime = new Date(data.last_seen).getTime();
        const now = new Date().getTime();
        const timeDiff = now - lastSeenTime;
        const isActuallyOnline = data.is_online && timeDiff < 30000; // 30 seconds (allows for network delays)
        
        console.log(`[PRESENCE-FETCH] ${data.username || userId}: DB says online=${data.is_online}, last_seen=${data.last_seen}, actually_online=${isActuallyOnline} (${Math.round(timeDiff/1000)}s ago)`);
        
        setPresenceState(prev => ({
          ...prev,
          [userId]: {
            isOnline: isActuallyOnline,
            lastSeen: data.last_seen || new Date().toISOString()
          }
        }));
      }
    } catch (error) {
      console.error('[PRESENCE-FETCH] Error:', error);
    }
  };

  const isUserOnline = (userId: string): boolean => {
    const now = Date.now();
    const lastFetch = lastFetchTime[userId] || 0;
    
    // Fetch if we haven't fetched before, or if it's been more than 5 seconds
    if (!presenceState[userId] || (now - lastFetch > 5000)) {
      setLastFetchTime(prev => ({ ...prev, [userId]: now }));
      fetchUserPresence(userId);
    }
    
    return presenceState[userId]?.isOnline || false;
  };

  const getUserPresenceText = (userId: string): string => {
    // Fetch presence if not in state
    if (!presenceState[userId]) {
      fetchUserPresence(userId);
      return "Offline"; // Return "Offline" instead of empty string while loading
    }
    
    const presence = presenceState[userId];
    if (!presence) return "Offline";
    
    if (presence.isOnline) {
      return "Active now";
    } else {
      return formatLastSeen(presence.lastSeen);
    }
  };

  const isUserCurrentlyActive = (userId: string): boolean => {
    // Fetch presence if not in state
    if (!presenceState[userId]) {
      fetchUserPresence(userId);
      return false; // Return false while loading
    }
    
    const presence = presenceState[userId];
    if (!presence) return false;
    
    if (presence.isOnline) return true;
    return isCurrentlyActive(presence.lastSeen);
  };

  return {
    presenceState,
    isUserOnline,
    getUserPresenceText,
    isUserCurrentlyActive,
    isConnected, // Export connection status
  };
}