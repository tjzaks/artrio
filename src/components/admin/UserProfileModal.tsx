import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Mail, Phone, Calendar, MapPin, Shield, Ban, AlertTriangle, MessageSquare, Users, Clock } from 'lucide-react';
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
}

interface UserAccountInfo {
  email: string;
  birthday: string | null;
  age: number | null;
  last_sign_in: string | null;
}

interface UserActivity {
  totalPosts: number;
  totalMessages: number;
  totalTrios: number;
  totalFriends: number;
  lastActive: string | null;
}

export default function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
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
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch auth user data (email) using admin RPC function
      let authUser: any = null;
      try {
        const { data: userData, error: authError } = await supabase
          .rpc('get_user_email_for_admin', { target_user_id: userId });
        
        if (!authError && userData && userData.length > 0) {
          authUser = userData[0];
        }
      } catch (error) {
        logger.warn('Could not fetch auth user data:', error);
      }
      
      if (authUser || true) { // Continue even if we can't get email
        // Fetch sensitive data (birthday)
        const { data: sensitiveData } = await supabase
          .from('sensitive_user_data')
          .select('birthday')
          .eq('user_id', userId)
          .single();

        // Calculate age
        let age = null;
        if (sensitiveData?.birthday) {
          const birthDate = new Date(sensitiveData.birthday);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        setAccountInfo({
          email: authUser.email || '',
          birthday: sensitiveData?.birthday || null,
          age: age,
          last_sign_in: authUser.last_sign_in_at || null
        });
      }

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
      logger.error('Error fetching user data:', error);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>User Profile Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center">Loading user data...</div>
        ) : profile ? (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="account">Account Info</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[500px] mt-4">
              <TabsContent value="profile" className="space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {profile.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold">@{profile.username}</h3>
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
                    
                    <div className="flex gap-2">
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">User ID: {profile.user_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Joined: {format(new Date(profile.created_at), 'PPP')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Updated: {format(new Date(profile.updated_at), 'PPP')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Username Changes: {profile.username_change_count || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Email: {accountInfo?.email || 'Loading...'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Phone: {formatPhoneNumber(profile.phone_number)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Birthday: {accountInfo?.birthday ? format(new Date(accountInfo.birthday), 'PPP') : 'Not provided'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Age: {accountInfo?.age || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Sign In: {accountInfo?.last_sign_in ? format(new Date(accountInfo.last_sign_in), 'PPP') : 'Never'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {profile.is_banned && (
                  <Card className="border-red-500">
                    <CardHeader>
                      <CardTitle className="text-sm text-red-600">Ban Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Reason: {profile.ban_reason || 'No reason provided'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-red-600" />
                        <span className="text-sm">
                          Banned At: {profile.banned_at ? format(new Date(profile.banned_at), 'PPP') : 'Unknown'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Active: {activity?.lastActive ? format(new Date(activity.lastActive), 'PPP') : 'Unknown'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="p-8 text-center text-muted-foreground">User not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}