import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Mail, Phone, Calendar, MapPin, Shield, Ban, AlertTriangle, MessageSquare, Users, Clock, Heart, Sparkles, Coffee, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';

interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
  username_change_count: number;
  last_username_change: string | null;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  personality_type: string | null;
  vibes: string[] | null;
  friend_type: string | null;
  excited_about: string | null;
  conversation_style: string | null;
  chat_time: string | null;
}

interface UserAccountInfo {
  email: string;
  birthday: string | null;
  age: number | null;
  last_sign_in: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
}

interface UserActivity {
  totalPosts: number;
  totalMessages: number;
  totalTrios: number;
  totalFriends: number;
  lastActive: string | null;
}

function UserProfileModalContent({ userId, isOpen, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accountInfo, setAccountInfo] = useState<UserAccountInfo | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && isOpen) {
      fetchUserData();
    }
  }, [userId, isOpen]);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      console.log('🔍 Starting fetchUserData for userId:', userId);
      // Fetch profile data
      console.log('🔍 Fetching profile data for user:', userId);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('🔍 Profile data response:', { profileData, profileError });

      if (profileError) throw profileError;
      setProfile(profileData);
      console.log('✅ Profile data set successfully:', profileData);

      // Fetch auth user data (email) using admin RPC function
      let authUser: any = null;
      try {
        console.log('🔍 Fetching auth data for user:', userId);
        console.log('🔍 Current user (should be admin):', await supabase.auth.getUser());
        
        const { data: authData, error: authError } = await supabase
          .rpc('admin_get_user_email', { target_user_id: userId });
        
        console.log('🔍 Admin get user email response:', { authData, authError });
        
        if (!authError && authData && !authData.error) {
          authUser = authData;
          console.log('✅ Auth user data fetched successfully:', authUser);
        } else {
          console.log('⚠️ Primary admin function failed, trying fallback...', { authError, authData });
          // Fallback to the old function if new one doesn't exist yet
          try {
            const { data: userData, error: fallbackError } = await supabase
              .rpc('get_user_email_for_admin', { target_user_id: userId });
            
            console.log('🔍 Fallback function response:', { userData, fallbackError });
            
            if (!fallbackError && userData && userData.length > 0) {
              authUser = userData[0];
              console.log('✅ Fallback auth data fetched:', authUser);
            } else {
              console.log('❌ Both admin functions failed:', { authError, fallbackError });
              logger.error('Both admin functions failed', { authError, fallbackError });
            }
          } catch (fallbackError) {
            console.error('❌ Fallback function threw error:', fallbackError);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching auth user data:', error);
        logger.warn('Could not fetch auth user data:', error);
      }
      
      // Fetch sensitive data (birthday) - try admin function first
      let sensitiveData: any = null;
      try {
        console.log('🔍 Fetching sensitive data for user:', userId);
        const { data: sensitiveResponse, error: sensitiveError } = await supabase
          .rpc('admin_get_sensitive_data', { target_user_id: userId });
        
        console.log('🔍 Sensitive data response:', { sensitiveResponse, sensitiveError });
        
        if (!sensitiveError && sensitiveResponse && !sensitiveResponse.error) {
          sensitiveData = sensitiveResponse;
          console.log('✅ Sensitive data fetched successfully:', sensitiveData);
        } else {
          console.log('⚠️ Admin sensitive data function failed, trying direct query...', { sensitiveError, sensitiveResponse });
        }
      } catch (error) {
        console.error('❌ Admin sensitive data function threw error:', error);
      }
      
      // Try direct query as fallback if admin function failed
      if (!sensitiveData) {
        try {
          console.log('🔍 Trying direct query to sensitive_user_data...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('sensitive_user_data')
            .select('birthday')
            .eq('user_id', userId)
            .maybeSingle();
          
          console.log('🔍 Direct sensitive data query:', { fallbackData, fallbackError });
          
          if (!fallbackError && fallbackData) {
            sensitiveData = fallbackData;
            console.log('✅ Fallback sensitive data fetched:', sensitiveData);
          } else {
            console.log('❌ Direct query also failed:', { fallbackError });
          }
        } catch (directError) {
          console.error('❌ Direct query threw error:', directError);
        }
      }
      
      // Always set account info, even if we couldn't get all the data
      // Use age from backend if available, otherwise calculate it
      let age = sensitiveData?.age || null;
      let birthdayToUse = sensitiveData?.birthday || authUser?.raw_user_meta_data?.birthday || null;
      
      // Calculate age if we have a birthday but no age
      if (!age && birthdayToUse) {
        try {
          const birthDate = new Date(birthdayToUse);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          console.log('🎂 Calculated age:', age, 'from birthday:', birthdayToUse);
        } catch (error) {
          console.error('❌ Error calculating age:', error, 'birthday:', birthdayToUse);
        }
      }

      const accountData = {
        email: authUser?.email || 'Unable to load - admin functions may need setup',
        birthday: sensitiveData?.birthday || authUser?.raw_user_meta_data?.birthday || null,
        age: age,
        last_sign_in: authUser?.last_sign_in_at || null,
        first_name: authUser?.raw_user_meta_data?.first_name || null,
        last_name: authUser?.raw_user_meta_data?.last_name || null,
        phone_number: authUser?.raw_user_meta_data?.phone || profileData?.phone_number || null
      };
      
      console.log('🔧 Setting account info:', accountData);
      setAccountInfo(accountData);

      // Fetch activity stats
      const [
        { count: postCount },
        { count: messageCount },
        { count: trioCount },
        { count: friendCount }
      ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', profileData.id),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', userId),
        supabase.from('trios').select('*', { count: 'exact', head: true }).or(`user1_id.eq.${userId},user2_id.eq.${userId},user3_id.eq.${userId}`),
        supabase.from('friendships').select('*', { count: 'exact', head: true }).or(`user_id.eq.${profileData.id},friend_id.eq.${profileData.id}`).eq('status', 'accepted')
      ]);

      setActivity({
        totalPosts: postCount || 0,
        totalMessages: messageCount || 0,
        totalTrios: trioCount || 0,
        totalFriends: Math.floor((friendCount || 0) / 2), // Each friendship is stored twice
        lastActive: profileData.updated_at
      });

    } catch (error) {
      console.error('❌ Critical error in fetchUserData:', error);
      logger.error('Error fetching user data:', error);
      
      // Set some fallback data so the component doesn't crash
      setAccountInfo({
        email: 'Error loading email',
        birthday: null,
        age: null,
        last_sign_in: null,
        first_name: null,
        last_name: null,
        phone_number: null
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string | null): string => {
    if (!phone) return 'Not provided';
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const formatVibes = (vibes: string[] | null): string => {
    if (!vibes || vibes.length === 0) return 'Not provided';
    return vibes.map(vibe => {
      // Convert database values back to readable labels
      const vibeLabels: Record<string, string> = {
        'creative': '🎨 Creative soul',
        'gamer': '🎮 Gamer at heart',
        'bookworm': '📚 Book nerd',
        'fitness': '🏃 Fitness enthusiast',
        'music': '🎵 Music lover',
        'foodie': '🍕 Foodie',
        'tech': '💻 Tech wizard',
        'adventure': '🌍 Adventure seeker'
      };
      return vibeLabels[vibe] || vibe;
    }).join(', ');
  };

  const formatFriendType = (friendType: string | null): string => {
    if (!friendType) return 'Not provided';
    const friendTypeLabels: Record<string, string> = {
      'snacks': 'Always has snacks 🍿',
      'tea': 'Knows all the tea ☕',
      'planner': 'Plans the adventures 🗺️',
      'advisor': 'Gives the best advice 💭',
      'comedian': 'Makes everyone laugh 😂',
      'dj': 'DJs the road trips 🎵'
    };
    return friendTypeLabels[friendType] || friendType;
  };

  const formatConversationStyle = (style: string | null): string => {
    if (!style) return 'Not provided';
    const styleLabels: Record<string, string> = {
      'facts': '🎲 Random fun facts',
      'deep': '🤔 Deep questions',
      'memes': '😂 Memes & jokes',
      'hottakes': '💭 Hot takes',
      'advice': '🎯 Life advice'
    };
    return styleLabels[style] || style;
  };

  const formatChatTime = (chatTime: string | null): string => {
    if (!chatTime) return 'Not provided';
    const timeLabels: Record<string, string> = {
      'earlybird': 'Early bird 🌅 (6am-12pm)',
      'afternoon': 'Afternoon vibes ☀️ (12pm-6pm)',
      'nightowl': 'Night owl 🦉 (6pm-12am)',
      'vampire': 'Vampire hours 🦇 (12am-6am)'
    };
    return timeLabels[chatTime] || chatTime;
  };

  const formatPersonalityType = (type: string | null): string => {
    if (!type) return 'Not provided';
    // Convert the value back to a readable label
    const personalityLabels: Record<string, string> = {
      'creative': 'Creative soul',
      'gamer': 'Gamer at heart',
      'bookworm': 'Book nerd',
      'fitness': 'Fitness enthusiast',
      'music': 'Music lover',
      'foodie': 'Foodie',
      'tech': 'Tech wizard',
      'adventurer': 'Adventure seeker',
      'movie': 'Movie buff',
      'nature': 'Nature lover',
      'fashionista': 'Fashion forward',
      'comedian': 'Class clown',
      'athlete': 'Sports fanatic',
      'social': 'Social butterfly',
      'introvert': 'Homebody',
      'nightowl': 'Night owl',
      'earlybird': 'Early bird',
      'wanderlust': 'World traveler',
      'pet': 'Pet parent',
      'coffee': 'Coffee addict'
    };
    return personalityLabels[type] || type;
  };

  const handleBanUser = async () => {
    if (!profile) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_banned: !profile.is_banned,
          ban_reason: !profile.is_banned ? 'Banned by admin' : null,
          banned_at: !profile.is_banned ? new Date().toISOString() : null
        })
        .eq('user_id', profile.user_id);

      await fetchUserData();
    } catch (error) {
      logger.error('Error updating ban status:', error);
    }
  };

  const handleToggleAdmin = async () => {
    if (!profile) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ is_admin: !profile.is_admin })
        .eq('user_id', profile.user_id);

      await fetchUserData();
    } catch (error) {
      logger.error('Error updating admin status:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you absolutely sure you want to permanently delete @${profile.username}'s account?\n\n` +
      'This action CANNOT be undone. All user data will be permanently removed including:\n' +
      '• Profile and account information\n' +
      '• All messages and conversations\n' +
      '• All posts and replies\n' +
      '• All friendships and friend requests\n' +
      '• Authentication credentials\n\n' +
      'The user will be able to sign up again with the same email/phone after deletion.'
    );
    
    if (!confirmed) return;
    
    // Double confirmation for safety
    const doubleConfirmed = window.confirm(
      `FINAL CONFIRMATION: Delete @${profile.username}'s account permanently?`
    );
    
    if (!doubleConfirmed) return;
    
    try {
      const { data, error } = await supabase.rpc('admin_delete_user_account', {
        target_user_id: profile.user_id
      });
      
      if (error) {
        logger.error('Error deleting account:', error);
        alert(`Failed to delete account: ${error.message}`);
        return;
      }
      
      if (data?.success) {
        alert(`Account @${profile.username} has been permanently deleted.`);
        onClose(); // Close the modal
      } else {
        alert(`Failed to delete account: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error deleting account:', error);
      alert('An error occurred while deleting the account.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full sm:max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-base sm:text-lg">User Profile Details</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="p-8 text-center">Loading user data...</div>
          ) : profile ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <Tabs defaultValue="profile" className="flex flex-col flex-1">
                <TabsList className="grid w-full grid-cols-3 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="account">Account Info</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <TabsContent value="profile" className="space-y-4 mt-4">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xl sm:text-2xl">
                          {profile.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <h3 className="text-xl sm:text-2xl font-bold">@{profile.username}</h3>
                      {profile.is_admin && (
                        <Badge variant="default" className="bg-purple-600">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {profile.is_banned && (
                        <Badge variant="destructive">
                          <Ban className="h-3 w-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                    </div>
                    
                    {profile.bio && (
                      <p className="text-muted-foreground">{profile.bio}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <Button
                        variant={profile.is_banned ? "outline" : "destructive"}
                        size="sm"
                        onClick={handleBanUser}
                      >
                        {profile.is_banned ? 'Unban User' : 'Ban User'}
                      </Button>
                      <Button
                        variant={profile.is_admin ? "outline" : "default"}
                        size="sm"
                        onClick={handleToggleAdmin}
                      >
                        {profile.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>

                <Card className="mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-all">User ID: {profile.user_id}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Joined: {format(new Date(profile.created_at), 'PPP')}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Last Updated: {format(new Date(profile.updated_at), 'PPP')}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Username Changes: {profile.username_change_count || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                  </TabsContent>

                  <TabsContent value="account" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Account Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-all">Email: {accountInfo?.email || 'Loading...'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Phone: {formatPhoneNumber(profile.phone_number || accountInfo?.phone_number)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Birthday: {accountInfo?.birthday ? format(new Date(accountInfo.birthday), 'PPP') : 'Not provided'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Age: {accountInfo?.age ? `${accountInfo.age} years old` : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Last Sign In: {accountInfo?.last_sign_in ? format(new Date(accountInfo.last_sign_in), 'PPP') : 'Never'}
                      </span>
                    </div>
                    {(accountInfo?.first_name || accountInfo?.last_name) && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-sm break-words">
                          Real Name: {[accountInfo?.first_name, accountInfo?.last_name].filter(Boolean).join(' ') || 'Not provided'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Signup Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Personality Type: {formatPersonalityType(profile?.personality_type)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Vibes: {formatVibes(profile?.vibes)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Friend Type: {formatFriendType(profile?.friend_type)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Conversation Style: {formatConversationStyle(profile?.conversation_style)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Best Chat Time: {formatChatTime(profile?.chat_time)}
                      </span>
                    </div>
                    {profile?.excited_about && (
                      <div className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="text-sm break-words">
                          <div className="font-medium mb-1">What they're excited about:</div>
                          <div className="text-muted-foreground italic">"{profile.excited_about}"</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Debug information - only show in development */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-4 p-2 bg-muted/50 rounded text-xs">
                        <div className="font-medium mb-1">Debug Info:</div>
                        <div>Profile fields available: {profile ? Object.keys(profile).join(', ') : 'No profile data'}</div>
                        <div>Auth user available: {accountInfo?.email ? 'Yes' : 'No'}</div>
                        <div>Sensitive data available: {accountInfo?.birthday ? 'Yes' : 'No'}</div>
                        <div>User ID: {userId}</div>
                        <div>Profile ID: {profile?.id}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {profile.is_banned && (
                  <Card className="border-red-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-red-600">Ban Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Ban className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm break-words">Reason: {profile.ban_reason || 'No reason provided'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm break-words">
                          Banned At: {profile.banned_at ? format(new Date(profile.banned_at), 'PPP') : 'Unknown'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Posts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{activity?.totalPosts || 0}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{activity?.totalMessages || 0}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Trios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{activity?.totalTrios || 0}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Friends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{activity?.totalFriends || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        Last Active: {activity?.lastActive ? format(new Date(activity.lastActive), 'PPP') : 'Unknown'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">User not found</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Wrapper component with error boundary
export default function UserProfileModal(props: UserProfileModalProps) {
  try {
    return <UserProfileModalContent {...props} />;
  } catch (error) {
    console.error('❌ UserProfileModal crashed:', error);
    return (
      <Dialog open={props.isOpen} onOpenChange={props.onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error Loading User Profile</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p className="text-muted-foreground mb-4">
              Sorry, there was an error loading the user profile. Please try again.
            </p>
            <Button onClick={props.onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}