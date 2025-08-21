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
          console.log(`Updated presence for ${user.id}: ${isOnline ? 'online' : 'offline'}`);
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
      },
    });

    // Track presence state
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('[PRESENCE] Sync event - current state:', state);
        const newPresenceState: PresenceState = {};
        
        Object.keys(state).forEach((userId) => {
          console.log(`[PRESENCE] User ${userId} is online`);
          newPresenceState[userId] = {
            isOnline: true,
            lastSeen: new Date().toISOString(),
          };
        });
        
        setPresenceState(newPresenceState);
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
        if (status === 'SUBSCRIBED') {
          // Send user's presence
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            user_id: user.id,
          });
        }
      });

    setChannel(presenceChannel);

    // Send heartbeat every 30 seconds to maintain presence
    const heartbeatInterval = setInterval(() => {
      updateOwnPresence(true);
      if (presenceChannel) {
        presenceChannel.track({
          online_at: new Date().toISOString(),
          user_id: user.id,
        });
      }
    }, 30000);

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
        .select('is_online, last_seen')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching presence for', userId, error);
        return;
      }
      
      if (data) {
        console.log(`Fetched presence for ${userId}: online=${data.is_online}, last_seen=${data.last_seen}`);
        setPresenceState(prev => ({
          ...prev,
          [userId]: {
            isOnline: data.is_online || false,
            lastSeen: data.last_seen || new Date().toISOString()
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching presence:', error);
    }
  };

  const isUserOnline = (userId: string): boolean => {
    // Fetch presence if not in state
    if (!presenceState[userId]) {
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