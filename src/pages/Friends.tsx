import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Clock, Check, X } from 'lucide-react';
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
    if (user) {
      loadFriends();
      loadFriendRequests();
    }
  }, [user]);

  const loadFriends = async () => {
    try {
      // Get user's profile ID
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!userProfile) return;

      // Get accepted friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select(`
          *,
          user:profiles!friendships_user_id_fkey(id, user_id, username, avatar_url, bio),
          friend:profiles!friendships_friend_id_fkey(id, user_id, username, avatar_url, bio)
        `)
        .eq('status', 'accepted')
        .or(`user_id.eq.${userProfile.id},friend_id.eq.${userProfile.id}`);

      if (friendships) {
        const friendsList = friendships.map(f => {
          // Return the friend (not the current user)
          return f.user_id === userProfile.id ? f.friend : f.user;
        });
        setFriends(friendsList);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      // Get user's profile ID
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!userProfile) return;

      // Get pending requests TO this user
      const { data: received } = await supabase
        .from('friendships')
        .select(`
          *,
          user:profiles!friendships_user_id_fkey(id, username, avatar_url, bio)
        `)
        .eq('friend_id', userProfile.id)
        .eq('status', 'pending');

      if (received) {
        setPendingRequests(received.map(r => ({ ...r, requester: r.user })));
      }

      // Get pending requests FROM this user
      const { data: sent } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:profiles!friendships_friend_id_fkey(id, username, avatar_url, bio)
        `)
        .eq('user_id', userProfile.id)
        .eq('status', 'pending');

      if (sent) {
        setSentRequests(sent.map(r => ({ ...r, requested: r.friend })));
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
      <header className="sticky safe-top z-40 bg-background border-b p-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Friends</h1>
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
            {friends.length === 0 ? (
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
                          <ClickableAvatar
                            userId={friend.user_id}
                            username={friend.username}
                            avatarUrl={friend.avatar_url}
                            size="md"
                          />
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