import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, userData: { username: string; birthday: string; bio?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  ensureAuthenticated: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage to prevent flashing
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('artrio-auth-user');
    return stored ? JSON.parse(stored) : null;
  });
  const [session, setSession] = useState<Session | null>(() => {
    const stored = localStorage.getItem('artrio-auth-session');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(() => {
    // Only show loading if we don't have cached auth state
    const hasStoredUser = localStorage.getItem('artrio-auth-user');
    return !hasStoredUser;
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    const stored = localStorage.getItem('artrio-is-admin');
    return stored === 'true';
  });
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        userRef.current = session?.user ?? null;
        
        // Store auth state in localStorage to prevent flashing
        if (session?.user) {
          localStorage.setItem('artrio-auth-user', JSON.stringify(session.user));
          localStorage.setItem('artrio-auth-session', JSON.stringify(session));
        } else {
          localStorage.removeItem('artrio-auth-user');
          localStorage.removeItem('artrio-auth-session');
          localStorage.removeItem('artrio-is-admin');
        }
        
        // Check admin status when user changes
        if (session?.user) {
          checkAdminStatus(session.user.id);
          // Update presence when user logs in
          await updatePresence(true, session.user.id);
        } else {
          setIsAdmin(false);
          // Update presence when user logs out
          if (userRef.current) {
            await updatePresence(false, userRef.current.id);
          }
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      userRef.current = session?.user ?? null;
      
      // Store user in localStorage
      if (session?.user) {
        localStorage.setItem('artrio-auth-user', JSON.stringify(session.user));
        checkAdminStatus(session.user.id);
        await updatePresence(true, session.user.id);
      } else {
        localStorage.removeItem('artrio-auth-user');
      }
      
      setLoading(false);
    });

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (userRef.current) {
        updatePresence(!document.hidden, userRef.current.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Send heartbeat every 30 seconds to maintain presence
    const heartbeatInterval = setInterval(() => {
      if (userRef.current && !document.hidden) {
        updatePresence(true, userRef.current.id);
      }
    }, 30000);

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      if (userRef.current) {
        updatePresence(false, userRef.current.id);
      }
    };
  }, []);

  const updatePresence = async (isOnline: boolean, userId?: string) => {
    // Presence tracking temporarily disabled
    // TODO: Implement user presence tracking
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      // Check the is_admin column in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single();
      
      const isAdminUser = profile?.is_admin || false;
      setIsAdmin(isAdminUser);
      localStorage.setItem('artrio-is-admin', isAdminUser.toString());
    } catch (error) {
      logger.error('Error checking admin status:', error);
      setIsAdmin(false);
      localStorage.setItem('artrio-is-admin', 'false');
    }
  };

  const signUp = async (email: string, password: string, userData: { username: string; birthday: string; bio?: string; personality_type?: string; first_name?: string; last_name?: string }) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: userData.username,
          birthday: userData.birthday,
          bio: userData.bio || null,
          personality_type: userData.personality_type || null,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null
        }
      }
    });

    if (authError) {
      return { error: authError };
    }

    // If signup succeeded and we have a session, user is logged in
    if (authData?.session) {
      // User is already logged in with the session
      setSession(authData.session);
      setUser(authData.user);
    }

    // If signup succeeded but user exists (email already registered)
    if (authData?.user && !authError) {
      // Try to manually create profile if it doesn't exist
      // This handles cases where the trigger might have failed
      try {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();

        if (!existingProfile) {
          // Create profile manually
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              username: userData.username,
              bio: userData.bio || null,
              avatar_url: null
            });

          if (profileError && !profileError.message.includes('duplicate')) {
            logger.error('Profile creation error:', profileError);
          }

          // Create sensitive data entry
          const { error: sensitiveError } = await supabase
            .from('sensitive_user_data')
            .insert({
              user_id: authData.user.id,
              birthday: userData.birthday
            });

          if (sensitiveError && !sensitiveError.message.includes('duplicate')) {
            logger.error('Sensitive data creation error:', sensitiveError);
          }
        }
      } catch (err) {
        logger.error('Error ensuring profile exists:', err);
      }
    }

    return { error: authError };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  const refreshSession = async (): Promise<Session | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        logger.error('Session refresh failed:', error);
        return null;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
        userRef.current = session.user;
        localStorage.setItem('artrio-auth-user', JSON.stringify(session.user));
        localStorage.setItem('artrio-auth-session', JSON.stringify(session));
      }
      
      return session;
    } catch (error) {
      logger.error('Error refreshing session:', error);
      return null;
    }
  };

  const ensureAuthenticated = async (): Promise<User | null> => {
    try {
      // First check current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.error('Error getting session:', error);
        return null;
      }
      
      if (session?.user) {
        // Update state if session exists
        if (session.user.id !== user?.id) {
          setSession(session);
          setUser(session.user);
          userRef.current = session.user;
        }
        return session.user;
      }
      
      // Try to refresh session if no current session
      const refreshedSession = await refreshSession();
      return refreshedSession?.user || null;
    } catch (error) {
      logger.error('Error ensuring authentication:', error);
      return null;
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    refreshSession,
    ensureAuthenticated
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}