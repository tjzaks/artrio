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
      // Presence tracking temporarily disabled
      // TODO: Implement user presence tracking
    };

    // Set user as online
    updateOwnPresence(true);

    // Create presence channel
    const presenceChannel = supabase.channel('presence:trio', {
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
        const newPresenceState: PresenceState = {};
        
        Object.keys(state).forEach((userId) => {
          newPresenceState[userId] = {
            isOnline: true,
            lastSeen: new Date().toISOString(),
          };
        });
        
        setPresenceState(newPresenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setPresenceState((prev) => ({
          ...prev,
          [key]: {
            isOnline: true,
            lastSeen: new Date().toISOString(),
          },
        }));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
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
      if (channel) {
        channel.track({
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
      
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const isUserOnline = (userId: string): boolean => {
    return presenceState[userId]?.isOnline || false;
  };

  const getUserPresenceText = (userId: string): string => {
    const presence = presenceState[userId];
    if (!presence) return "";
    
    if (presence.isOnline) {
      return "Active now";
    } else {
      return formatLastSeen(presence.lastSeen);
    }
  };

  const isUserCurrentlyActive = (userId: string): boolean => {
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