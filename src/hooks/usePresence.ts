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
          filter: `user_id=neq.${user.id}`, // Listen to all users except self
        },
        (payload) => {
          if (payload.new && (payload.new as any).user_id) {
            const userId = (payload.new as any).user_id;
            const isOnline = (payload.new as any).is_online;
            const lastSeen = (payload.new as any).last_seen;
            console.log(`[PRESENCE-DB-CHANGE] User ${userId} presence updated: online=${isOnline}`);
            
            // Update local state with database change
            setPresenceState(prev => ({
              ...prev,
              [userId]: {
                isOnline: isOnline || false,
                lastSeen: lastSeen || new Date().toISOString()
              }
            }));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(profilesSubscription);
    };
  }, [user]);
  
  useEffect(() => {
    if (!user) return;

    // Update user's own presence in database
    const updateOwnPresence = async (isOnline: boolean) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_online: isOnline,
            last_seen: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error updating presence:', error);
        } else {
          console.log(`[PRESENCE-DB] Updated ${user.id}: ${isOnline ? 'ONLINE' : 'OFFLINE'} at ${new Date().toISOString()}`);
        }
      } catch (error) {
        console.error('Error updating presence:', error);
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
          // Send user's presence
          const trackData = {
            online_at: new Date().toISOString(),
            user_id: user.id,
            username: user.email?.split('@')[0] || 'Unknown',
          };
          console.log('[PRESENCE-TRACK] Sending presence:', trackData);
          await presenceChannel.track(trackData);
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

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched to another tab/minimized
        updateOwnPresence(false);
      } else {
        // User returned to the tab
        updateOwnPresence(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
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
        const isActuallyOnline = data.is_online && timeDiff < 30000; // 30 seconds
        
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
    // Always fetch fresh presence data for accuracy
    if (!presenceState[userId] || Date.now() % 10000 < 100) { // Refresh every ~10 seconds
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
  };
}