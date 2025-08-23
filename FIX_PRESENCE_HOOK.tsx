// PRESENCE HOOK ISSUES FOUND:

/*
PROBLEMS IDENTIFIED:

1. RACE CONDITION: Hook tries to update presence before checking if profile exists
   - Line 66-92: updateOwnPresence() called immediately without verifying profile exists
   
2. FILTER BUG: Line 32 uses filter that EXCLUDES current user from their own updates
   - filter: `user_id=neq.${user.id}` means "not equal to current user"
   - This prevents seeing your own presence updates!

3. DOUBLE SUBSCRIPTION: Both WebSocket presence AND database subscriptions
   - This causes conflicts and inconsistent state
   
4. VISIBILITY API ISSUE: Sets user offline when switching tabs (line 187)
   - This is too aggressive - users appear offline just for checking another tab

5. FETCH TIMING: Line 229 uses 30-second window but heartbeat is 10 seconds
   - Mismatch causes users to appear offline between heartbeats

FIX PLAN:

1. Check if profile exists before updating presence
2. Remove the neq filter or make it include self
3. Pick ONE source of truth (database OR websocket, not both)
4. Don't set offline on tab switch, only on actual disconnect
5. Align timing windows with heartbeat interval
*/

// FIXED VERSION OF usePresence.ts:

import { useEffect, useState } from 'react';
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
  const [profileExists, setProfileExists] = useState<boolean>(false);

  // FIRST: Check if profile exists
  useEffect(() => {
    if (!user) return;
    
    const checkProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (data && !error) {
        setProfileExists(true);
        console.log('[PRESENCE] Profile exists for user:', user.id);
      } else {
        console.error('[PRESENCE] No profile found for user:', user.id);
        // Try to create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            username: user.email?.split('@')[0] || 'User',
            is_online: false,
            last_seen: new Date().toISOString()
          });
        
        if (!insertError) {
          setProfileExists(true);
          console.log('[PRESENCE] Created profile for user:', user.id);
        }
      }
    };
    
    checkProfile();
  }, [user]);

  // Set up database subscription for ALL presence updates (including self)
  useEffect(() => {
    if (!user || !profileExists) return;
    
    // Subscribe to ALL profiles changes (remove the neq filter)
    const profilesSubscription = supabase
      .channel('profiles-presence-all')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          // NO FILTER - see all updates including our own
        },
        (payload) => {
          if (payload.new && (payload.new as any).user_id) {
            const userId = (payload.new as any).user_id;
            const isOnline = (payload.new as any).is_online;
            const lastSeen = (payload.new as any).last_seen;
            
            console.log(`[PRESENCE] User ${userId} updated: online=${isOnline}`);
            
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
      .subscribe((status) => {
        console.log('[PRESENCE] Subscription status:', status);
      });
    
    return () => {
      supabase.removeChannel(profilesSubscription);
    };
  }, [user, profileExists]);
  
  // Update own presence (ONLY if profile exists)
  useEffect(() => {
    if (!user || !profileExists) return;

    const updateOwnPresence = async (isOnline: boolean) => {
      console.log(`[PRESENCE] Updating ${user.id} to ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
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
        console.error('[PRESENCE] Update failed:', error);
      } else {
        console.log('[PRESENCE] Update successful:', data);
      }
    };

    // Set online immediately
    updateOwnPresence(true);

    // Heartbeat every 15 seconds
    const heartbeatInterval = setInterval(() => {
      updateOwnPresence(true);
    }, 15000);

    // Only set offline when page actually unloads
    const handleUnload = () => {
      updateOwnPresence(false);
    };
    
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      updateOwnPresence(false);
    };
  }, [user, profileExists]);

  // Fetch initial presence for all friends
  useEffect(() => {
    if (!user) return;
    
    const fetchAllPresence = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, is_online, last_seen');
      
      if (data && !error) {
        const newState: PresenceState = {};
        data.forEach(profile => {
          // Consider online if last_seen within 20 seconds
          const lastSeenTime = new Date(profile.last_seen).getTime();
          const isRecentlyActive = Date.now() - lastSeenTime < 20000;
          
          newState[profile.user_id] = {
            isOnline: profile.is_online && isRecentlyActive,
            lastSeen: profile.last_seen
          };
        });
        setPresenceState(newState);
        console.log('[PRESENCE] Loaded initial state for', Object.keys(newState).length, 'users');
      }
    };
    
    fetchAllPresence();
  }, [user]);

  const isUserOnline = (userId: string): boolean => {
    return presenceState[userId]?.isOnline || false;
  };

  const getUserPresenceText = (userId: string): string => {
    const presence = presenceState[userId];
    if (!presence) return "Offline";
    
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