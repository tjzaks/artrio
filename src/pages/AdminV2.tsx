import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Users, Calendar, Shield, Search, Shuffle, 
  Mail, Phone, User, Cake, MessageSquare, UserCheck, Hash
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UserData {
  user_id: string;
  email: string;
  phone: string | null;
  username: string;
  first_name: string | null;
  last_name: string | null;
  birthday: string | null;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
  personality_type: string | null;
  created_at: string;
  last_sign_in: string | null;
  is_admin: boolean;
  is_banned: boolean;
  total_posts: number;
  total_messages: number;
  total_friends: number;
}

interface Stats {
  totalUsers: number;
  totalTrios: number;
  todaysTrios: number;
  totalPosts: number;
  totalMessages: number;
}

const AdminV2 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [randomizing, setRandomizing] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      // Check admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();

      if (!profile?.is_admin) {
        toast({
          title: 'Access Denied',
          description: 'Admin privileges required',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      
      // Load all data
      await Promise.all([
        loadUsers(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Admin check error:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('📊 Loading user data...');
      
      // Use our new comprehensive function
      const { data, error } = await supabase
        .rpc('admin_get_all_user_data');
      
      if (error) {
        console.error('Error loading users:', error);
        
        // Fallback to basic profiles if function doesn't exist yet
        const { data: profiles } = await supabase
          .from('profiles')
          .select(`
            user_id,
            username,
            bio,
            avatar_url,
            phone_number,
            personality_type,
            created_at,
            is_admin,
            is_banned
          `)
          .order('created_at', { ascending: false });

        if (profiles) {
          // Map to our UserData format with limited info
          const basicUsers = profiles.map(p => ({
            user_id: p.user_id,
            email: 'Loading...',
            phone: p.phone_number,
            username: p.username,
            first_name: null,
            last_name: null,
            birthday: null,
            age: null,
            bio: p.bio,
            avatar_url: p.avatar_url,
            personality_type: p.personality_type,
            created_at: p.created_at,
            last_sign_in: null,
            is_admin: p.is_admin || false,
            is_banned: p.is_banned || false,
            total_posts: 0,
            total_messages: 0,
            total_friends: 0
          }));
          setUsers(basicUsers);
        }
      } else if (data) {
        console.log('✅ Loaded', data.length, 'users with full data');
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get counts
      const [
        { count: totalUsers },
        { count: totalTrios },
        { count: todaysTrios },
        { count: totalPosts },
        { count: totalMessages }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('trios').select('*', { count: 'exact', head: true }),
        supabase.from('trios').select('*', { count: 'exact', head: true }).eq('date', today),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalTrios: totalTrios || 0,
        todaysTrios: todaysTrios || 0,
        totalPosts: totalPosts || 0,
        totalMessages: totalMessages || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleRandomizeTrios = async () => {
    const confirmed = window.confirm(
      'This will create new random trios for today. Continue?'
    );
    
    if (!confirmed) return;
    
    setRandomizing(true);
    try {
      const { error } = await supabase.rpc('randomize_trios');
      
      if (error) throw error;
      
      toast({
        title: 'Success!',
        description: 'New trios have been created',
      });
      
      await loadStats();
    } catch (error) {
      console.error('Randomize error:', error);
      toast({
        title: 'Error',
        description: 'Failed to randomize trios',
        variant: 'destructive'
      });
    } finally {
      setRandomizing(false);
    }
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'No number entered at signup';
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return date;
    }
  };

  const formatBirthday = (birthday: string | null) => {
    if (!birthday) return 'Not provided';
    try {
      return format(new Date(birthday + 'T00:00:00'), 'MMM dd, yyyy');
    } catch {
      return birthday;
    }
  };

  const filteredUsers = users.filter(u => 
    searchTerm === '' || 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="p-4 pt-safe flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <Button
            onClick={handleRandomizeTrios}
            disabled={randomizing}
            className="bg-gradient-to-r from-purple-600 to-blue-600"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            {randomizing ? 'Randomizing...' : 'Randomize Trios'}
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold">{stats?.totalUsers || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total Users</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats?.totalTrios || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total Trios</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Calendar className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{stats?.todaysTrios || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Today's Trios</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Hash className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold">{stats?.totalPosts || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total Posts</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <MessageSquare className="h-5 w-5 text-pink-600" />
                <span className="text-2xl font-bold">{stats?.totalMessages || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Messages</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>
              All Users ({filteredUsers.length} of {users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                    selectedUser?.user_id === user.user_id ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">@{user.username}</span>
                          {user.is_admin && (
                            <Badge className="bg-purple-600 text-white text-xs">Admin</Badge>
                          )}
                          {user.is_banned && (
                            <Badge variant="destructive" className="text-xs">Banned</Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {formatPhone(user.phone)}
                            </span>
                            {user.age && (
                              <span className="flex items-center gap-1">
                                <Cake className="h-3 w-3" />
                                {user.age} years old
                              </span>
                            )}
                          </div>
                          
                          {(user.first_name || user.last_name) && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                      <div>Joined: {formatDate(user.created_at)}</div>
                      <div>Active: {formatDate(user.last_sign_in)}</div>
                      <div className="mt-1 space-x-3">
                        <span>{user.total_posts} posts</span>
                        <span>{user.total_messages} msgs</span>
                        <span>{user.total_friends} friends</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details when Selected */}
                  {selectedUser?.user_id === user.user_id && (
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="font-semibold">User ID:</span> {user.user_id}
                        </div>
                        <div>
                          <span className="font-semibold">Birthday:</span> {formatBirthday(user.birthday)}
                        </div>
                        <div>
                          <span className="font-semibold">Personality:</span> {user.personality_type || 'Not set'}
                        </div>
                        <div>
                          <span className="font-semibold">Bio:</span> {user.bio || 'No bio'}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/${user.username}`);
                          }}
                        >
                          View Profile
                        </Button>
                        {!user.is_admin && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-purple-600 border-purple-600"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await supabase
                                .from('profiles')
                                .update({ is_admin: true })
                                .eq('user_id', user.user_id);
                              await loadUsers();
                              toast({ title: 'User promoted to admin' });
                            }}
                          >
                            Make Admin
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminV2;