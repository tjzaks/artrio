import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import storage from '@/utils/storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, userData: { username: string; birthday: string; bio?: string; phone?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  ensureAuthenticated: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, onLoadingChange }: { children: ReactNode; onLoadingChange?: (loading: boolean) => void }) {
  
  // Initialize states without localStorage (will load async)
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);
  const userRef = useRef<User | null>(null);


  // Notify parent of loading changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  // Load stored auth state on mount
  useEffect(() => {
    
    const loadStoredAuth = async () => {
      try {
        const storedUser = await storage.getItem('artrio-auth-user');
        const storedSession = await storage.getItem('artrio-auth-session');
        const storedAdmin = await storage.getItem('artrio-is-admin');
        
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        if (storedSession) {
          setSession(JSON.parse(storedSession));
        }
        if (storedAdmin === 'true') {
          setIsAdmin(true);
        }
        
        // Only set loading false if no stored user (wait for auth check otherwise)
        if (!storedUser) {
          setLoading(false);
        }
      } catch (error) {
        logger.error('Error loading stored auth:', error);
        setLoading(false);
      }
    };
    
    loadStoredAuth();
  }, []);

  useEffect(() => {
    
    try {
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          
          setSession(session);
          setUser(session?.user ?? null);
          userRef.current = session?.user ?? null;
        
        // Store auth state to prevent flashing
        if (session?.user) {
          storage.setItem('artrio-auth-user', JSON.stringify(session.user));
          storage.setItem('artrio-auth-session', JSON.stringify(session));
        } else {
          storage.removeItem('artrio-auth-user');
          storage.removeItem('artrio-auth-session');
          storage.removeItem('artrio-is-admin');
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
      
      // Store user
      if (session?.user) {
        storage.setItem('artrio-auth-user', JSON.stringify(session.user));
        checkAdminStatus(session.user.id);
        await updatePresence(true, session.user.id);
      } else {
        storage.removeItem('artrio-auth-user');
      }
      
      setLoading(false);
    }).catch((error) => {
      setLoading(false);
    });

    } catch (error) {
      setLoading(false);
    }

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
    if (!userId) return;
    
    try {
      // Update the user's presence in the profiles table
      await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
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
      storage.setItem('artrio-is-admin', isAdminUser.toString());
    } catch (error) {
      logger.error('Error checking admin status:', error);
      setIsAdmin(false);
      storage.setItem('artrio-is-admin', 'false');
    }
  };

  const signUp = async (email: string, password: string, userData: { username: string; birthday: string; bio?: string; phone?: string; personality_type?: string; first_name?: string; last_name?: string }) => {
    console.log('📱 SignUp - Phone data received:', userData.phone);
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
          const phoneToStore = userData.phone ? userData.phone.replace(/\D/g, '') : null;
          console.log('📱 SignUp - Storing phone in profiles:', phoneToStore);
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              username: userData.username,
              bio: userData.bio || null,
              avatar_url: null,
              phone_number: phoneToStore
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
    try {
      // Enhanced debug for iOS Simulator
      const isIOSApp = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Artrio iOS App');
      
      if (isIOSApp) {
        console.log('📱 Email:', email);
        console.log('📱 Supabase client exists:', !!supabase);
        console.log('📱 Supabase auth exists:', !!supabase?.auth);
        console.log('📱 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
        console.log('📱 User Agent:', window.navigator.userAgent);
        console.log('📱 Current URL:', window.location.href);
        console.log('📱 localStorage available:', !!window.localStorage);
        
        // Test Supabase connection
        try {
          console.log('📱 Testing Supabase connection...');
          const testResult = await supabase.from('profiles').select('count').limit(1);
          console.log('📱 Supabase connection test:', testResult.error ? 'FAILED' : 'SUCCESS');
          if (testResult.error) {
            console.error('📱 Connection test error:', testResult.error);
          }
        } catch (testErr) {
          console.error('📱 Connection test exception:', testErr);
        }
      }
      
      console.log('📱 Calling signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (isIOSApp) {
        console.log('📱 Sign in response - data:', !!data);
        console.log('📱 Sign in response - error:', error);
        if (error) {
          console.error('📱 Full error object:', JSON.stringify(error, null, 2));
          console.error('📱 Error message:', error.message);
          console.error('📱 Error status:', error.status);
          console.error('📱 Error name:', error.name);
        }
      }
      
      if (error) {
        console.error('🔐 Sign in error:', error);
      }
      
      return { error };
    } catch (err: any) {
      console.error('📱 CRITICAL: Unexpected sign in exception:', err);
      console.error('📱 Error type:', typeof err);
      console.error('📱 Error message:', err?.message);
      console.error('📱 Error stack:', err?.stack);
      return { error: err };
    }
  };

  const signOut = async () => {
    // Clear all state first
    setIsAdmin(false);
    setUser(null);
    setSession(null);
    
    // Clear all localStorage
    localStorage.clear();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Force a hard reload to the auth page
    if (typeof window !== 'undefined') {
      window.location.replace('/auth');
    }
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
        storage.setItem('artrio-auth-user', JSON.stringify(session.user));
        storage.setItem('artrio-auth-session', JSON.stringify(session));
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