import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Shield, MessageSquare, PartyPopper, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import MediaUpload from '@/components/MediaUpload';
import { usePresence } from '@/hooks/usePresence';
import { cleanErrorMessage } from '@/utils/errorMessages';
import HealthCheck from '@/components/HealthCheck';
import Stories from '@/components/Stories';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  is_birthday?: boolean;
}

interface Trio {
  id: string;
  date: string;
  user1_id: string;
  user2_id: string;
  user3_id: string | null;
  profiles: Profile[];
}

interface Post {
  id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  user_id: string;
  profiles: Profile;
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  profiles: Profile;
}

const Home = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSubscribed } = useRealtimeNotifications();
  const { isUserOnline } = usePresence();
  const [currentTrio, setCurrentTrio] = useState<Trio | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newPost, setNewPost] = useState('');
  const [newReply, setNewReply] = useState('');
  const [canPost, setCanPost] = useState(true);
  const [secondsUntilNextPost, setSecondsUntilNextPost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [pendingFriendRequests, setPendingFriendRequests] = useState<number>(0);

  useEffect(() => {
    if (user) {
      // Force reset notifications first
      setUnreadMessages(0);
      setPendingFriendRequests(0);
      
      fetchUserProfile();
      fetchTodaysTrio();
      checkPostRateLimit();
      checkQueueStatus();
      fetchNotificationCounts();
      
      // Subscribe to real-time updates for notification counts
      const messagesChannel = supabase
        .channel('notification-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            console.log('New message event:', payload);
            // Refresh notification counts when new messages arrive
            fetchNotificationCounts();
          }
        )
        .subscribe();
      
      const friendshipsChannel = supabase
        .channel('notification-friendships')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships'
          },
          (payload) => {
            console.log('Friendship event:', payload);
            // Refresh notification counts when friendship status changes
            fetchNotificationCounts();
          }
        )
        .subscribe();
      
      return () => {
        messagesChannel.unsubscribe();
        friendshipsChannel.unsubscribe();
      };
    } else {
      // Clear counts when no user
      setUnreadMessages(0);
      setPendingFriendRequests(0);
    }
  }, [user]);

  // Refresh notification counts when component regains focus or visibility changes
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchNotificationCounts();
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchNotificationCounts();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Add keyboard shortcuts for health check and debug
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setShowHealthCheck(!showHealthCheck);
      }
      // Debug shortcut: Cmd/Ctrl + D
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        console.log('=== DEBUG NOTIFICATION STATE ===');
        console.log('unreadMessages:', unreadMessages);
        console.log('pendingFriendRequests:', pendingFriendRequests);
        console.log('user:', user);
        // Force reset
        console.log('Force resetting notifications to 0...');
        setUnreadMessages(0);
        setPendingFriendRequests(0);
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [showHealthCheck, unreadMessages, pendingFriendRequests, user]);

  useEffect(() => {
    if (!canPost && secondsUntilNextPost > 0) {
      const timer = setInterval(() => {
        setSecondsUntilNextPost(prev => {
          if (prev <= 1) {
            setCanPost(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [canPost, secondsUntilNextPost]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      logger.error('Error fetching user profile:', error);
    }
  };

  const fetchTodaysTrio = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's trio using AUTH USER ID
      // Use multiple queries to find the trio (PostgREST OR syntax issue workaround)
      const { data: trios, error: trioError } = await supabase
        .from('trios')
        .select('*')
        .eq('date', today);
      
      // First get the user's profile to find their profile ID
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      // Find the trio that contains this user (using profile id)
      const trio = trios?.find(t => 
        t.user1_id === userProfile?.id ||
        t.user2_id === userProfile?.id ||
        t.user3_id === userProfile?.id
      );

      if (trioError && trioError.code !== 'PGRST116') {
        logger.error('Error fetching trio:', trioError);
        return;
      }

      if (trio) {
        // Collect all profile IDs, filtering out null values
        const profileIds = [
          trio.user1_id,
          trio.user2_id,
          trio.user3_id
        ].filter(Boolean);

        // Fetch profiles for all trio members (using profile id)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, username, bio, avatar_url')
          .in('id', profileIds);

        if (profilesError) {
          logger.error('Error fetching profiles:', profilesError);
          return;
        }

        // Check birthdays for each profile
        const profilesWithBirthdays = await Promise.all(
          (profiles || []).map(async (profile) => {
            const { data: birthdayData } = await supabase
              .rpc('get_user_birthday_display', { target_user_id: profile.user_id });
            
            return {
              ...profile,
              is_birthday: birthdayData?.is_birthday || false
            };
          })
        );

        setCurrentTrio({ ...trio, profiles: profilesWithBirthdays });
        
        // Fetch posts for this trio
        await fetchTrioPosts(trio.id);
      } else {
        // No trio for today - just show the empty state, no toast
      }
    } catch (error) {
      logger.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load today\'s trio',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationCounts = async () => {
    if (!user) return;
    
    try {
      // Reset counts first
      setUnreadMessages(0);
      setPendingFriendRequests(0);
      
      // Get unread messages count
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (convError) {
        console.error('Error fetching conversations:', convError);
        return;
      }
      
      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        
        // Debug: Log what we're querying
        console.log('Checking unread messages for conversations:', conversationIds);
        
        const { data: unreadMessages, count: unreadCount, error: messageError } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, is_read', { count: 'exact' })
          .in('conversation_id', conversationIds)
          .eq('is_read', false)
          .neq('sender_id', user.id);
        
        if (messageError) {
          console.error('Error fetching unread messages:', messageError);
          setUnreadMessages(0);
        } else {
          console.log('Unread messages found:', unreadMessages);
          console.log('Unread count:', unreadCount);
          // Ensure we set 0 if count is null or undefined
          setUnreadMessages(unreadCount ?? 0);
        }
      } else {
        console.log('No conversations found for user');
        // Explicitly set to 0 when no conversations
        setUnreadMessages(0);
      }
      
      // Get pending friend requests count
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setPendingFriendRequests(0);
        return;
      }
      
      if (userProfile) {
        const { count: requestCount, error: friendError } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .eq('friend_id', userProfile.id)
          .eq('status', 'pending');
        
        if (friendError) {
          console.error('Error fetching friend requests:', friendError);
          setPendingFriendRequests(0);
        } else {
          setPendingFriendRequests(requestCount ?? 0);
        }
      }
    } catch (error) {
      logger.error('Error fetching notification counts:', error);
      // Reset counts on error
      setUnreadMessages(0);
      setPendingFriendRequests(0);
    }
  };

  const fetchTrioPosts = async (trioId: string) => {
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('trio_id', trioId)
        .order('created_at', { ascending: false });

      if (postsError) {
        logger.error('Error fetching posts:', postsError);
        return;
      }

      if (postsData) {
        // Fetch profiles for post authors
        const userIds = [...new Set(postsData.map(post => post.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url, user_id')
          .in('user_id', userIds);

        const postsWithProfiles = postsData.map(post => ({
          ...post,
          profiles: profiles?.find(p => p.user_id === post.user_id) || {
            id: '',
            user_id: '',
            username: 'Unknown',
            bio: null,
            avatar_url: null
          }
        }));

        setPosts(postsWithProfiles);
      }

      // Fetch replies for all posts
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(post => post.id);
        const { data: repliesData, error: repliesError } = await supabase
          .from('replies')
          .select('*')
          .in('post_id', postIds)
          .order('created_at', { ascending: true });

        if (!repliesError && repliesData) {
          // Fetch profiles for reply authors
          const replyUserIds = [...new Set(repliesData.map(reply => reply.user_id))];
          const { data: replyProfiles } = await supabase
            .from('profiles')
            .select('id, username, bio, avatar_url, user_id')
            .in('user_id', replyUserIds);

          const repliesWithProfiles = repliesData.map(reply => ({
            ...reply,
            profiles: replyProfiles?.find(p => p.user_id === reply.user_id) || {
              id: '',
              user_id: '',
              username: 'Unknown',
              bio: null,
              avatar_url: null
            }
          }));

          setReplies(repliesWithProfiles);
        }
      }
    } catch (error) {
      logger.error('Error fetching posts:', error);
    }
  };

  const checkPostRateLimit = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('seconds_until_next_post', {
        user_id_param: user.id
      });
      
      if (error) {
        logger.error('Error checking rate limit:', error);
        return;
      }
      
      setSecondsUntilNextPost(data || 0);
      setCanPost((data || 0) === 0);
    } catch (error) {
      logger.error('Error checking rate limit:', error);
    }
  };

  const handlePostSubmit = async () => {
    if ((!newPost.trim() && !mediaUrl) || !currentTrio || !canPost) return;

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,
          trio_id: currentTrio.id,
          content: newPost.trim() || null,
          media_url: mediaUrl || null,
          media_type: mediaType || null
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message === 'new row violates row-level security policy for table "posts"' 
            ? 'Please wait 10 minutes between posts to prevent spam.'
            : cleanErrorMessage(error),
          variant: 'destructive'
        });
        return;
      }

      setNewPost('');
      setMediaUrl('');
      setMediaType(null);
      toast({
        title: 'Post sent!',
        description: 'Your post has been shared with your trio'
      });
      
      // Refresh posts and rate limit
      await fetchTrioPosts(currentTrio.id);
      await checkPostRateLimit();
    } catch (error) {
      logger.error('Error posting:', error);
      toast({
        title: 'Error',
        description: 'Failed to send post',
        variant: 'destructive'
      });
    }
  };

  const handleMediaUploaded = (url: string, type: 'image' | 'video') => {
    setMediaUrl(url);
    setMediaType(type);
  };

  const checkQueueStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_queue_status');
      if (!error && data) {
        setInQueue(data.in_queue);
        setQueueCount(data.queue_count);
      }
    } catch (error) {
      logger.error('Error checking queue status:', error);
    }
  };

  const joinQueue = async () => {
    setJoiningQueue(true);
    try {
      // Get the user's profile_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      const { data, error } = await supabase.rpc('join_trio_queue', {
        p_profile_id: profile.id
      });
      
      if (error) {
        // Check for specific error types
        if (error.message?.includes('Already in queue')) {
          setInQueue(true);
          return;
        }
        if (error.message?.includes('Already in a trio')) {
          await fetchTodaysTrio();
          return;
        }
        throw error;
      }
      
      // Handle success response
      if (data?.matched) {
        toast({
          title: 'Matched!',
          description: 'You\'ve been matched into a trio!'
        });
        await fetchTodaysTrio();
      } else {
        // Just joined queue
        setInQueue(true);
        setQueueCount(data?.queue_position || 1);
      }
    } catch (error) {
      logger.error('Error joining queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to join queue',
        variant: 'destructive'
      });
    } finally {
      setJoiningQueue(false);
    }
  };

  const leaveQueue = async () => {
    try {
      const { error } = await supabase.rpc('leave_trio_queue');
      if (!error) {
        setInQueue(false);
        setQueueCount(0);
        toast({
          title: 'Trio Matching Canceled',
          description: "Artrio isn't the same without Trios!",
          className: 'gradient-toast'
        });
      }
    } catch (error) {
      logger.error('Error leaving queue:', error);
    }
  };

  const handleReplySubmit = async (postId: string) => {
    if (!newReply.trim()) return;

    try {
      const { error } = await supabase
        .from('replies')
        .insert({
          user_id: user?.id,
          post_id: postId,
          content: newReply.trim()
        });

      if (error) {
        toast({
          title: 'Error',
          description: cleanErrorMessage(error),
          variant: 'destructive'
        });
        return;
      }

      setNewReply('');
      toast({
        title: 'Reply sent!',
        description: 'Your reply has been posted'
      });
      
      // Refresh posts and replies
      if (currentTrio) {
        await fetchTrioPosts(currentTrio.id);
      }
    } catch (error) {
      logger.error('Error replying:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive'
      });
    }
  };

  const getTimeUntilNextTrio = () => {
    return 'Daily between 7 AM - 11 PM';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading your trio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showHealthCheck && <HealthCheck onClose={() => setShowHealthCheck(false)} />}
      <header className="sticky top-0 z-40 navigation-glass">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/artrio-logo-smooth.png" alt="Artrio" className="h-11 w-auto" />
              {isSubscribed && (
                <Badge className="badge-green text-xs px-2 py-0 pulse">
                  Live
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {userProfile && (
                <div className="text-sm font-medium mr-2">
                  Hey @{userProfile.username}!
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate('/friends')} className="h-8 px-2 relative">
                <User className="h-4 w-4" />
                {pendingFriendRequests > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingFriendRequests}
                  </div>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  // Force clear notifications immediately
                  setUnreadMessages(0);
                  navigate('/messages');
                }} 
                className="h-8 px-2 relative"
              >
                <MessageSquare className="h-4 w-4" />
                {unreadMessages > 0 && (
                  <div 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Badge clicked - unreadMessages value:', unreadMessages);
                      console.log('Type of unreadMessages:', typeof unreadMessages);
                      alert(`Notification count: ${unreadMessages}\nClick OK to reset to 0`);
                      setUnreadMessages(0);
                    }}
                  >
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </div>
                )}
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="h-8 px-2">
                  <Shield className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/profile')} 
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                title="Your Profile"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={userProfile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {userProfile?.username?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Stories Bar */}
        <Stories trioMemberIds={currentTrio?.profiles.map(p => p.user_id) || []} />
      </header>

      <main className="p-4 space-y-4 pb-20">
        {currentTrio ? (
          <>
            {/* Trio Panel */}
            <Card className="content-card animate-in">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" style={{color: 'hsl(195 45% 55%)'}} />
                  {currentTrio.profiles.length === 1 
                    ? "Flying Solo Today" 
                    : currentTrio.profiles.length === 2 
                    ? "Your Duo Today" 
                    : "Today's Trio"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {currentTrio.profiles.map((profile) => (
                    <div 
                      key={profile.id} 
                      className="flex flex-col items-center gap-2 min-w-0 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/user/${profile.user_id}`)}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>
                            {profile.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Show birthday indicator if it's their birthday, otherwise show online status */}
                        {profile.is_birthday ? (
                          <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-1">
                            <PartyPopper className="h-3 w-3 text-white" />
                          </div>
                        ) : isUserOnline(profile.user_id) ? (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                        ) : null}
                      </div>
                      <div className="text-center min-w-0">
                        <p className="font-medium text-sm truncate w-16">@{profile.username}</p>
                        {profile.user_id === user?.id && (
                          <Badge variant="secondary" className="text-xs mt-1">You</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {currentTrio.profiles.length < 3 && (
                  <div className="mt-3 text-sm text-muted-foreground text-center">
                    {currentTrio.profiles.length === 1 
                      ? "🔄 Waiting for more people to join..." 
                      : "🔄 Looking for one more person to complete your trio..."}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post Box */}
            <Card className="content-card animate-slide-up">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Share with your trio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="What's happening?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  disabled={!canPost}
                  className="min-h-[80px] resize-none"
                />
                
                {canPost && (
                  <MediaUpload 
                    onMediaUploaded={handleMediaUploaded}
                    className="w-full"
                  />
                )}
                
                <Button 
                  onClick={handlePostSubmit}
                  disabled={(!newPost.trim() && !mediaUrl) || !canPost}
                  className="w-full"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {!canPost ? `Wait ${Math.floor(secondsUntilNextPost / 60)}:${(secondsUntilNextPost % 60).toString().padStart(2, '0')}` : 'Share'}
                </Button>
                
                {!canPost && (
                  <p className="text-sm text-muted-foreground text-center">
                    Wait {Math.floor(secondsUntilNextPost / 60)} minutes and {secondsUntilNextPost % 60} seconds to post again (spam prevention)
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Posts and Replies */}
            <div className="space-y-3">
              {posts.map((post) => {
                const postReplies = replies.filter(reply => reply.post_id === post.id);
                const userHasReplied = postReplies.some(reply => reply.user_id === user?.id);
                
                return (
                  <Card key={post.id} className="content-card animate-slide-up">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={post.profiles.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {post.profiles.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-sm truncate">@{post.profiles.username}</p>
                            <p className="text-xs text-muted-foreground flex-shrink-0">
                              {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {post.content && <p className="text-sm leading-relaxed break-words">{post.content}</p>}
                          
                          {/* Media Display */}
                          {post.media_url && (
                            <div className="mt-3">
                              {post.media_type === 'image' ? (
                                <img 
                                  src={post.media_url} 
                                  alt="Post media" 
                                  className="max-w-full h-auto rounded-lg border"
                                  style={{ maxHeight: '300px' }}
                                />
                              ) : post.media_type === 'video' ? (
                                <video 
                                  src={post.media_url} 
                                  controls 
                                  className="max-w-full h-auto rounded-lg border"
                                  style={{ maxHeight: '300px' }}
                                />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Replies */}
                      {postReplies.length > 0 && (
                        <div className="ml-11 space-y-2 border-l-2 border-muted pl-3">
                          {postReplies.slice(0, 3).map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarImage src={reply.profiles.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {reply.profiles.username.substring(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-xs truncate">@{reply.profiles.username}</p>
                                  <p className="text-xs text-muted-foreground flex-shrink-0">
                                    {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <p className="text-sm break-words">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                          {postReplies.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{postReplies.length - 3} more replies
                            </p>
                          )}
                        </div>
                      )}

                      {/* Reply input */}
                      {post.user_id !== user?.id && !userHasReplied && (
                        <div className="ml-11 space-y-2">
                          <Textarea
                            placeholder="Reply..."
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            className="min-h-[60px] text-sm resize-none"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleReplySubmit(post.id)}
                            disabled={!newReply.trim()}
                            className="h-8"
                          >
                            Reply
                          </Button>
                        </div>
                      )}

                      {userHasReplied && (
                        <p className="ml-11 text-xs text-muted-foreground">
                          ✓ Replied
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">
                  {inQueue ? 'Looking for your Trio' : 'No trio yet'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {inQueue 
                    ? `${3 - queueCount} more ${3 - queueCount === 1 ? 'person' : 'people'} needed for a trio`
                    : 'Join the queue to get matched instantly when others are ready'}
                </p>
              </div>
              
              {inQueue ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative h-20 w-32">
                      {/* Animated Artrio logo */}
                      <style jsx>{`
                        @keyframes fadeInOut1 {
                          0%, 100% { opacity: 0.3; }
                          33% { opacity: 1; }
                        }
                        @keyframes fadeInOut2 {
                          0%, 100% { opacity: 0.3; }
                          66% { opacity: 1; }
                        }
                        @keyframes fadeInOut3 {
                          0%, 100% { opacity: 0.3; }
                          75% { opacity: 1; }
                        }
                      `}</style>
                      <div className="flex items-center justify-center h-full gap-2">
                        <div 
                          className="w-6 h-16 rounded-full"
                          style={{ 
                            backgroundColor: '#D73935',
                            animation: 'fadeInOut1 2s infinite'
                          }}
                        />
                        <div 
                          className="w-6 h-16 rounded-full"
                          style={{ 
                            backgroundColor: '#7BB146',
                            animation: 'fadeInOut2 2s infinite'
                          }}
                        />
                        <div 
                          className="w-6 h-16 rounded-full"
                          style={{ 
                            backgroundColor: '#1BA0CC',
                            animation: 'fadeInOut3 2s infinite'
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">
                        Matching you with the right people
                      </span>
                    </div>
                  </div>
                  <Button 
                    onClick={leaveQueue}
                    variant="outline"
                    size="sm"
                  >
                    Stop Searching
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={joinQueue}
                  disabled={joiningQueue}
                  size="lg"
                  className="w-full max-w-xs"
                >
                  {joiningQueue ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Find my Trio
                    </>
                  )}
                </Button>
              )}

            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Home;