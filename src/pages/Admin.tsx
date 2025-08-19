import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Users, Calendar, BarChart3, Shield, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import UserProfileModal from '@/components/admin/UserProfileModal';

interface AdminStats {
  totalUsers: number;
  totalProfiles: number;
  totalTrios: number;
  todaysTrios: number;
  totalPosts: number;
  todaysPosts: number;
  recentUsers: Array<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
    ageRange: string;
    is_admin?: boolean;
    is_banned?: boolean;
  }>;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      // Check if user has admin privileges in their profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        logger.error('Error checking admin access:', error);
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this page',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      if (!profile?.is_admin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchAdminStats();
    } catch (error) {
      logger.error('Error:', error);
      navigate('/');
    }
  };

  const fetchAdminStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get total users count
      const { count: totalUsers, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        logger.error('Error getting user count:', countError);
      }
      
      logger.log('Total users count:', totalUsers);

      // Get total profiles count (should be same as users)
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total trios count
      const { count: totalTrios } = await supabase
        .from('trios')
        .select('*', { count: 'exact', head: true });

      // Get today's trios count
      const { count: todaysTrios } = await supabase
        .from('trios')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // Get total posts count
      const { count: totalPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      // Get today's posts count
      const { count: todaysPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get ALL users sorted by most recent first with more details
      const { data: recentProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, created_at, is_admin')
        .order('created_at', { ascending: false });

      if (profilesError) {
        logger.error('Error fetching profiles:', profilesError);
        // Don't continue if there's an error
        throw profilesError;
      }
      
      logger.log('Fetched profiles:', recentProfiles?.length || 0, recentProfiles);

      // Make sure we have an array, even if it's empty
      const recentUsers = (recentProfiles || []).map(profile => ({
        user_id: profile.user_id || '',
        username: profile.username || 'Unknown',
        avatar_url: profile.avatar_url || null,
        created_at: profile.created_at || new Date().toISOString(),
        ageRange: 'Hidden', // Age information is now protected
        is_admin: profile.is_admin || false,
        is_banned: false // Column doesn't exist yet in production
      }));
      
      logger.log('Mapped recentUsers:', recentUsers.length, recentUsers);

      setStats({
        totalUsers: totalUsers || 0,
        totalProfiles: totalProfiles || 0,
        totalTrios: totalTrios || 0,
        todaysTrios: todaysTrios || 0,
        totalPosts: totalPosts || 0,
        todaysPosts: todaysPosts || 0,
        recentUsers
      });
    } catch (error) {
      logger.error('Error fetching admin stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getAgeRange = (birthday: string): string => {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age >= 15 && age <= 17) return '15-17';
    if (age >= 18 && age <= 21) return '18-21';
    if (age >= 22 && age <= 25) return '22-25';
    if (age >= 26) return '26+';
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{stats?.totalUsers || 0} users</span>
            <span>•</span>
            <span>{stats?.todaysTrios || 0} trios today</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.totalUsers || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.totalTrios || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Trios</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.todaysTrios || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Today's Trios</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.totalPosts || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Posts</p>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">User Management</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button 
                  onClick={fetchAdminStats}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats?.recentUsers?.length || 0} registered users
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <p className="text-muted-foreground text-center py-8">
                  Loading users...
                </p>
              ) : stats && stats.recentUsers && Array.isArray(stats.recentUsers) && stats.recentUsers.length > 0 ? (
                stats.recentUsers
                  .filter(user => 
                    searchTerm === '' || 
                    user.username.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((user) => (
                  <div 
                    key={user.user_id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                    onClick={() => {
                      setSelectedUserId(user.user_id);
                      setIsProfileModalOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">@{user.username}</p>
                          {user.is_admin && (
                            <Badge variant="default" className="text-xs h-5 px-2 bg-purple-600">
                              Admin
                            </Badge>
                          )}
                          {user.is_banned && (
                            <Badge variant="destructive" className="text-xs h-5 px-2">
                              Banned
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs"
                    >
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {searchTerm ? 'No users found matching your search' : 'No users found'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Profile Modal */}
        <UserProfileModal
          userId={selectedUserId}
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedUserId(null);
            fetchAdminStats(); // Refresh stats after potential changes
          }}
        />
      </main>
    </div>
  );
};

export default Admin;