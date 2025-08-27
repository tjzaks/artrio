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
        <div className="p-4 pt-safe">
          <div className="flex items-center justify-between mb-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
              className="text-base"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleRandomizeTrios}
              disabled={randomizing}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-sm px-4 py-2"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              {randomizing ? 'Randomizing...' : 'Randomize Trios'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Users className="h-6 w-6 text-purple-600" />
                <span className="text-3xl font-bold">{stats?.totalUsers || 0}</span>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Users className="h-6 w-6 text-blue-600" />
                <span className="text-3xl font-bold">{stats?.totalTrios || 0}</span>
                <p className="text-sm text-muted-foreground">Total Trios</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Calendar className="h-6 w-6 text-green-600" />
                <span className="text-3xl font-bold">{stats?.todaysTrios || 0}</span>
                <p className="text-sm text-muted-foreground">Today's Trios</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-background">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Hash className="h-6 w-6 text-amber-600" />
                <span className="text-3xl font-bold">{stats?.totalPosts || 0}</span>
                <p className="text-sm text-muted-foreground">Total Posts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages Card - Full Width on Mobile */}
        <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/20 dark:to-background">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <MessageSquare className="h-6 w-6 text-pink-600" />
              <span className="text-3xl font-bold">{stats?.totalMessages || 0}</span>
              <p className="text-sm text-muted-foreground">Total Messages</p>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-base h-12"
          />
        </div>

        {/* Users List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">
              All Users ({filteredUsers.length} of {users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 max-h-[600px] overflow-y-auto p-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedUser?.user_id === user.user_id ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 shadow-md' : 'hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-lg font-semibold">
                        {user.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">@{user.username}</span>
                        {user.is_admin && (
                          <Badge className="bg-purple-600 text-white text-xs px-2 py-0.5">Admin</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-0.5">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{user.email || 'Loading...'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {formatPhone(user.phone)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details when Selected */}
                  {selectedUser?.user_id === user.user_id && (
                    <div className="mt-4 pt-4 border-t-2 space-y-3 bg-gray-50 dark:bg-gray-900/50 -mx-4 px-4 pb-2">
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        {/* Contact Info */}
                        <div className="space-y-2">
                          <div className="font-semibold text-base mb-2">Contact Information</div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{formatPhone(user.phone)}</span>
                          </div>
                          {(user.first_name || user.last_name) && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{[user.first_name, user.last_name].filter(Boolean).join(' ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Personal Info */}
                        <div className="space-y-2">
                          <div className="font-semibold text-base mb-2">Personal Details</div>
                          <div className="flex items-center gap-2">
                            <Cake className="h-4 w-4 text-muted-foreground" />
                            <span>Birthday: {formatBirthday(user.birthday)}</span>
                            {user.age && <span className="text-muted-foreground">({user.age} years old)</span>}
                          </div>
                          {user.bio && (
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <span className="italic">"{user.bio}"</span>
                            </div>
                          )}
                        </div>

                        {/* Activity Stats */}
                        <div className="space-y-2">
                          <div className="font-semibold text-base mb-2">Activity</div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                              <div className="text-xl font-bold">{user.total_posts}</div>
                              <div className="text-xs text-muted-foreground">Posts</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                              <div className="text-xl font-bold">{user.total_messages}</div>
                              <div className="text-xs text-muted-foreground">Messages</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                              <div className="text-xl font-bold">{user.total_friends}</div>
                              <div className="text-xs text-muted-foreground">Friends</div>
                            </div>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>Joined: {formatDate(user.created_at)}</div>
                          <div>Last active: {formatDate(user.last_sign_in)}</div>
                          <div className="font-mono text-xs opacity-50">ID: {user.user_id}</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
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
                            className="flex-1 text-purple-600 border-purple-600"
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