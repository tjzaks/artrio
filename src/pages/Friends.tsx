import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Clock, Check, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ClickableAvatar from '@/components/ClickableAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import AddFriend from '@/components/AddFriend';

interface Friend {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_online?: boolean;
}

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  requester?: Friend;
  requested?: Friend;
}

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    console.log('[FRIENDS] useEffect triggered, user:', user);
    
    // Add a small delay on mount to ensure auth is ready
    const loadData = async () => {
      // First verify we have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user || user) {
        console.log('[FRIENDS] Session ready, loading data');
        await loadFriends();
        await loadFriendRequests();
      } else {
        console.error('[FRIENDS] No session available yet');
        // Retry once after a short delay
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession?.user) {
            console.log('[FRIENDS] Session ready on retry');
            await loadFriends();
            await loadFriendRequests();
          } else {
            setLoading(false);
          }
        }, 1000);
      }
    };
    
    loadData();
  }, [user]);

  // Subscribe to real-time presence updates for friends
  useEffect(() => {
    if (!user || friends.length === 0) return;

    console.log('[FRIENDS] Setting up presence subscription for:', friends.map(f => f.username));

    // Subscribe to ALL profile updates (simpler and more reliable)
    const channel = supabase
      .channel('friends-presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload: any) => {
          // Check if this update is for one of our friends
          const friendUserIds = friends.map(f => f.user_id);
          if (friendUserIds.includes(payload.new.user_id)) {
            console.log('[FRIENDS] Friend presence update:', payload.new.username, 'is_online:', payload.new.is_online);
            
            // Update the friend's online status in state
            setFriends(prev => 
              prev.map(friend => 
                friend.user_id === payload.new.user_id
                  ? { ...friend, is_online: payload.new.is_online, last_seen: payload.new.last_seen }
                  : friend
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[FRIENDS] Subscription status:', status);
      });

    return () => {
      console.log('[FRIENDS] Cleaning up presence subscription');
      supabase.removeChannel(channel);
    };
  }, [user, friends]);

  const loadFriends = async () => {
    try {
      console.log('[FRIENDS] Loading friends for user:', user?.id);
      
      // Double-check we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || user?.id;
      
      if (!currentUserId) {
        console.error('[FRIENDS] No user ID available from session or context');
        setLoading(false);
        return;
      }
      
      console.log('[FRIENDS] Using user ID:', currentUserId);
      
      // Get user's profile ID
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      console.log('[FRIENDS] User profile:', userProfile, 'Error:', profileError);
      
      if (profileError) {
        console.error('[FRIENDS] Profile error:', profileError.message, profileError.details);
        setLoading(false);
        return;
      }
      
      if (!userProfile) {
        console.error('[FRIENDS] No user profile found');
        setLoading(false);
        return;
      }

      // Get accepted friendships - simplified query first
      const { data: friendships, error: friendshipError } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userProfile.id},friend_id.eq.${userProfile.id}`);

      console.log('[FRIENDS] Friendships query result:', friendships, 'Error:', friendshipError);

      if (friendships && friendships.length > 0) {
        // Get the profile IDs of friends
        const friendProfileIds = friendships.map(f => 
          f.user_id === userProfile.id ? f.friend_id : f.user_id
        );
        
        console.log('[FRIENDS] Friend profile IDs:', friendProfileIds);
        
        // Fetch the profiles of friends
        const { data: friendProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, username, avatar_url, bio, is_online')
          .in('id', friendProfileIds);
        
        console.log('[FRIENDS] Friend profiles:', friendProfiles, 'Error:', profilesError);
        
        if (friendProfiles) {
          setFriends(friendProfiles);
        }
      } else {
        console.log('[FRIENDS] No friendships found');
        setFriends([]);
      }
    } catch (error) {
      console.error('[FRIENDS] Error loading friends:', error);
      toast({
        title: 'Error loading friends',
        description: 'Please check your connection and try again',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      console.log('[FRIENDS] Loading friend requests for user:', user?.id);
      
      // Double-check we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || user?.id;
      
      if (!currentUserId) {
        console.error('[FRIENDS] No user ID for friend requests');
        return;
      }
      
      // Get user's profile ID
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      console.log('[FRIENDS] Profile for requests:', userProfile, 'Error:', profileError);
      
      if (!userProfile) return;

      // Get pending requests TO this user - simplified query
      const { data: received, error: receivedError } = await supabase
        .from('friendships')
        .select('*')
        .eq('friend_id', userProfile.id)
        .eq('status', 'pending');
      
      console.log('[FRIENDS] Received requests:', received, 'Error:', receivedError);

      // Get pending requests FROM this user - simplified query
      const { data: sent, error: sentError } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('status', 'pending');
      
      console.log('[FRIENDS] Sent requests:', sent, 'Error:', sentError);

      // Fetch profiles for received requests
      if (received && received.length > 0) {
        const requesterIds = received.map(r => r.user_id);
        const { data: requesterProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, username, avatar_url, bio')
          .in('id', requesterIds);
        
        const receivedWithProfiles = received.map(req => ({
          ...req,
          requester: requesterProfiles?.find(p => p.id === req.user_id)
        }));
        
        setPendingRequests(receivedWithProfiles);
      } else {
        setPendingRequests([]);
      }

      // Fetch profiles for sent requests
      if (sent && sent.length > 0) {
        const requestedIds = sent.map(s => s.friend_id);
        const { data: requestedProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, username, avatar_url, bio')
          .in('id', requestedIds);
        
        const sentWithProfiles = sent.map(req => ({
          ...req,
          requested: requestedProfiles?.find(p => p.id === req.friend_id)
        }));
        
        setSentRequests(sentWithProfiles);
      } else {
        setSentRequests([]);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Friend request accepted!',
        description: 'You are now friends.'
      });

      // Reload data
      loadFriends();
      loadFriendRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept friend request',
        variant: 'destructive'
      });
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Friend request declined',
        description: 'The request has been removed.'
      });

      // Reload data
      loadFriendRequests();
    } catch (error) {
      console.error('Error declining request:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline friend request',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background border-b p-4 pt-safe">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Friends</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('[FRIENDS] Manual refresh triggered');
              setLoading(true);
              loadFriends();
              loadFriendRequests();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">
              Friends {friends.length > 0 && `(${friends.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="add">Add</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Loading friends...</p>
                </CardContent>
              </Card>
            ) : friends.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No friends yet</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setActiveTab('add')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friends
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <Card key={friend.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-3 flex-1"
                          onClick={() => navigate(`/user/${friend.user_id}`)}
                        >
                          <div className="relative">
                            <ClickableAvatar
                              userId={friend.user_id}
                              username={friend.username}
                              avatarUrl={friend.avatar_url}
                              size="md"
                            />
                            {friend.is_online && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">@{friend.username}</p>
                            {friend.bio && (
                              <p className="text-sm text-muted-foreground">{friend.bio}</p>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Create or find conversation then navigate
                            try {
                              // Check if conversation exists between these two users
                              const { data: existing } = await supabase
                                .from('conversations')
                                .select('id')
                                .or(`and(user1_id.eq.${user?.id},user2_id.eq.${friend.user_id}),and(user1_id.eq.${friend.user_id},user2_id.eq.${user?.id})`)
                                .single();

                              if (!existing) {
                                // Create new conversation
                                const { data: newConv, error } = await supabase
                                  .from('conversations')
                                  .insert({
                                    user1_id: user?.id,
                                    user2_id: friend.user_id
                                  })
                                  .select()
                                  .single();
                                
                                if (error) throw error;
                                navigate(`/messages?conversation=${newConv.id}`);
                              } else {
                                navigate(`/messages?conversation=${existing.id}`);
                              }
                            } catch (error) {
                              console.error('Error creating conversation:', error);
                              navigate('/messages');
                            }
                          }}
                        >
                          Message
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {pendingRequests.length === 0 && sentRequests.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Received Requests */}
                {pendingRequests.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">Received</h3>
                    {pendingRequests.map(request => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {request.requester ? (
                                <ClickableAvatar
                                  userId={request.requester.id}
                                  username={request.requester.username}
                                  avatarUrl={request.requester.avatar_url}
                                  size="md"
                                />
                              ) : (
                                <Avatar>
                                  <AvatarFallback>??</AvatarFallback>
                                </Avatar>
                              )}
                              <div>
                                <p className="font-medium">@{request.requester?.username}</p>
                                <p className="text-sm text-muted-foreground">
                                  Wants to be friends
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => acceptFriendRequest(request.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => declineFriendRequest(request.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">Sent</h3>
                    {sentRequests.map(request => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {request.requested ? (
                                <ClickableAvatar
                                  userId={request.requested.id}
                                  username={request.requested.username}
                                  avatarUrl={request.requested.avatar_url}
                                  size="md"
                                />
                              ) : (
                                <Avatar>
                                  <AvatarFallback>??</AvatarFallback>
                                </Avatar>
                              )}
                              <div>
                                <p className="font-medium">@{request.requested?.username}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="add">
            <AddFriend />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}