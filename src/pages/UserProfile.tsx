import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, User, Share, UserX, UserCheck, Copy, MessageSquare, PartyPopper, Cake, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePresence } from '@/hooks/usePresence';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProfileSkeleton from '@/components/ProfileSkeleton';
import ReportUserDialog from '@/components/ReportUserDialog';
import { logger } from '@/utils/logger';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isUserOnline, getUserPresenceText } = usePresence();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [birthday, setBirthday] = useState<string | null>(null);
  const [isBirthday, setIsBirthday] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [unfriendClicks, setUnfriendClicks] = useState(0);
  const [unfriendTimer, setUnfriendTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      checkBlockStatus();
      checkFriendStatus();
    }
    
    // Cleanup timer on unmount
    return () => {
      if (unfriendTimer) {
        clearTimeout(unfriendTimer);
      }
    };
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      // Fetch the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        logger.error('Error fetching profile:', profileError);
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive'
        });
        return;
      }

      setProfile(profileData);

      // Fetch age range if available
      const { data: ageData, error: ageError } = await supabase
        .rpc('get_user_age_range', { profile_user_id: userId });

      if (!ageError && ageData) {
        setAgeRange(ageData);
      }

      // Fetch birthday info (month and day only for privacy)
      const { data: birthdayData, error: birthdayError } = await supabase
        .rpc('get_user_birthday_display', { target_user_id: userId });

      if (!birthdayError && birthdayData) {
        setBirthday(birthdayData.display_date);
        setIsBirthday(birthdayData.is_birthday);
      }
    } catch (error) {
      logger.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkBlockStatus = async () => {
    if (!userId || !user) return;

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .single();

      if (!error && data) {
        setIsBlocked(true);
      }
    } catch (error) {
      // Not blocked or error checking
    }
  };

  const handleBlock = async () => {
    if (!userId || !user) return;

    setBlockLoading(true);
    try {
      if (isBlocked) {
        // Unblock
        const { error } = await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', userId);

        if (error) throw error;

        setIsBlocked(false);
        toast({
          title: 'User unblocked',
          description: 'You can now see content from this user.',
        });
      } else {
        // Block
        const { error } = await supabase
          .from('user_blocks')
          .insert({
            blocker_id: user.id,
            blocked_id: userId
          });

        if (error) throw error;

        setIsBlocked(true);
        toast({
          title: 'User blocked',
          description: 'You will no longer see content from this user.',
        });
      }
    } catch (error) {
      logger.error('Error updating block status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update block status',
        variant: 'destructive'
      });
    } finally {
      setBlockLoading(false);
    }
  };

  const handleShare = async () => {
    const profileUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${profile?.username}'s Profile`,
          text: `Check out @${profile?.username}'s profile on our app!`,
          url: profileUrl,
        });
      } catch (error) {
        // Fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied',
        description: 'Profile link copied to clipboard!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive'
      });
    }
  };

  const checkFriendStatus = async () => {
    if (!userId || !user) return;

    try {
      // Get current user's profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Get target user's profile
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (userProfile && targetProfile) {
        // Check friendship status
        const { data: friendship } = await supabase
          .from('friendships')
          .select('status')
          .or(`and(user_id.eq.${userProfile.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${userProfile.id})`)
          .maybeSingle();

        if (friendship) {
          setFriendStatus(friendship.status === 'accepted' ? 'accepted' : 'pending');
        }
      }
    } catch (error) {
      logger.error('Error checking friend status:', error);
    }
  };

  const handleUnfriend = async () => {
    if (!userId || !user) return;

    // Reset timer on each click
    if (unfriendTimer) {
      clearTimeout(unfriendTimer);
    }

    // Increment click count
    const newClickCount = unfriendClicks + 1;
    setUnfriendClicks(newClickCount);

    // If third click, actually unfriend
    if (newClickCount >= 3) {
      setSendingRequest(true);
      try {
        // Get current user's profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        // Get target user's profile
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (userProfile && targetProfile) {
          // Delete friendship - need to check both directions
          const { data: existingFriendship, error: findError } = await supabase
            .from('friendships')
            .select('id')
            .or(`and(user_id.eq.${userProfile.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${userProfile.id})`)
            .single();

          if (findError) {
            console.error('Error finding friendship:', findError);
            throw findError;
          }

          if (existingFriendship) {
            const { error: deleteError } = await supabase
              .from('friendships')
              .delete()
              .eq('id', existingFriendship.id);

            if (deleteError) {
              console.error('Error deleting friendship:', deleteError);
              throw deleteError;
            }
          }

          setFriendStatus('none');
          setUnfriendClicks(0);
          toast({
            title: 'Unfriended',
            description: `You are no longer friends with @${profile?.username}`,
          });
        }
      } catch (error) {
        logger.error('Error unfriending:', error);
        toast({
          title: 'Error',
          description: 'Failed to unfriend user',
          variant: 'destructive'
        });
      } finally {
        setSendingRequest(false);
        setUnfriendClicks(0);
      }
    } else {
      // Set timer to reset clicks after 8 seconds
      const timer = setTimeout(() => {
        setUnfriendClicks(0);
      }, 8000);
      setUnfriendTimer(timer);
    }
  };

  const handleAddFriend = async () => {
    if (!userId || !user || sendingRequest) return;

    setSendingRequest(true);
    try {
      // Get current user's profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Get target user's profile
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!userProfile || !targetProfile) {
        toast({
          title: 'Error',
          description: 'Could not find profile information',
          variant: 'destructive'
        });
        return;
      }

      // Check if friendship already exists
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${userProfile.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${userProfile.id})`)
        .maybeSingle();

      if (existingFriendship) {
        if (existingFriendship.status === 'pending') {
          toast({
            title: 'Request already sent',
            description: 'Your friend request is pending',
          });
        } else if (existingFriendship.status === 'accepted') {
          toast({
            title: 'Already friends',
            description: 'You are already friends with this user',
          });
        }
        return;
      }

      // Send friend request
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: userProfile.id,
          friend_id: targetProfile.id,
          status: 'pending'
        });

      if (error) {
        logger.error('Friend request error:', error);
        throw error;
      }

      setFriendStatus('pending');
      toast({
        title: 'Friend request sent!',
        description: `Friend request sent to @${profile?.username}`,
      });
    } catch (error) {
      logger.error('Error sending friend request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send friend request',
        variant: 'destructive'
      });
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-3 pt-safe">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-bold">Profile</h1>
          </div>
        </header>
        <main className="p-4">
          <ProfileSkeleton />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-lg">Profile not found</div>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  const isOwnProfile = profile.user_id === user?.id;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-3 pt-safe">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-bold">Profile</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
                {isOwnProfile && (
                  <Badge variant="secondary" className="ml-2">You</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {profile.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  {userId && isUserOnline(userId) && (
                    <div className="absolute bottom-0 right-0 h-6 w-6 bg-green-500 border-3 border-background rounded-full" />
                  )}
                  {/* Birthday indicator */}
                  {isBirthday && (
                    <div className="absolute -bottom-1 -left-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-1.5">
                      <PartyPopper className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold">@{profile.username}</h2>
                  {/* Online status text */}
                  {userId && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getUserPresenceText(userId)}
                    </p>
                  )}
                  {ageRange && (
                    <p className="text-muted-foreground">Age: {ageRange}</p>
                  )}
                  {isBirthday && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 rounded-full">
                      <Cake className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                      <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
                        It's my birthday! 🎉
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="space-y-2">
                  <h3 className="font-semibold">About</h3>
                  <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Account Info */}
              <div className="space-y-2">
                <h3 className="font-semibold">Account Information</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {birthday && (
                    <div className="flex items-center gap-2">
                      <Cake className="h-4 w-4" />
                      <span>Birthday: {birthday}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-3">
                {isOwnProfile ? (
                  <Button 
                    onClick={() => navigate('/profile')} 
                    className="w-full"
                    variant="outline"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {friendStatus === 'none' && (
                        <Button 
                          onClick={handleAddFriend}
                          variant="default"
                          className="flex-1"
                          disabled={sendingRequest}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {sendingRequest ? 'Sending...' : 'Add Friend'}
                        </Button>
                      )}
                      {friendStatus === 'pending' && (
                        <Button 
                          variant="secondary"
                          className="flex-1"
                          disabled
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Request Pending
                        </Button>
                      )}
                      {friendStatus === 'accepted' && (
                        <Button 
                          variant={unfriendClicks > 0 ? "destructive" : "secondary"}
                          className="flex-1"
                          onClick={handleUnfriend}
                          disabled={sendingRequest}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          {unfriendClicks === 0 && 'Friends'}
                          {unfriendClicks === 1 && 'Unfriend?'}
                          {unfriendClicks === 2 && 'Are you sure?'}
                        </Button>
                      )}
                      <Button 
                        onClick={() => navigate(`/messages?user=${userId}`)}
                        variant="outline"
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      <Button 
                        onClick={handleShare}
                        variant="outline"
                        size="icon"
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                    <ReportUserDialog 
                      reportedUserId={profile.user_id}
                      reportedUsername={profile.username}
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default UserProfile;