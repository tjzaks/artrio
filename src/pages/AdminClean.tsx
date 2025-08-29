import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Shuffle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneNumber } from '@/utils/phoneFormat';

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
  created_at: string;
  last_sign_in: string | null;
  is_admin: boolean;
  is_banned: boolean;
  total_posts: number;
  total_messages: number;
  total_friends: number;
}

const AdminClean = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [randomizing, setRandomizing] = useState(false);

  // Stats
  const totalUsers = users.length;
  const totalTrios = users.reduce((acc, u) => acc + (u.total_friends > 0 ? 1 : 0), 0);
  const totalMessages = users.reduce((acc, u) => acc + u.total_messages, 0);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();

      if (!profile?.is_admin) {
        navigate('/');
        return;
      }

      await loadUsers();
    } catch (error) {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Try the admin RPC function first
      const { data, error } = await supabase
        .rpc('admin_get_all_user_data');
      
      if (error) {
        console.error('Admin RPC error:', error);
        
        // Fallback: Get basic profile data and auth emails separately
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profiles) {
          // For each profile, try to get auth data
          const enrichedUsers = await Promise.all(
            profiles.map(async (p) => {
              // Try to get user email from auth.users (admin only)
              let email = 'N/A';
              try {
                const { data: authData } = await supabase.auth.admin.getUserById(p.user_id);
                if (authData?.user?.email) {
                  email = authData.user.email;
                }
              } catch {
                // If we can't get auth data, that's okay
              }
              
              return {
                user_id: p.user_id,
                email: email,
                phone: p.phone_number || null,
                username: p.username,
                first_name: null,
                last_name: null,
                birthday: null,
                age: null,
                bio: p.bio,
                avatar_url: p.avatar_url,
                created_at: p.created_at,
                last_sign_in: null,
                is_admin: p.is_admin || false,
                is_banned: p.is_banned || false,
                total_posts: 0,
                total_messages: 0,
                total_friends: 0
              };
            })
          );
          setUsers(enrichedUsers);
        }
      } else if (data) {
        // Success - use the admin data
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({ 
        title: 'Error loading users', 
        description: 'Check console for details',
        variant: 'destructive' 
      });
    }
  };

  const handleRandomizeTrios = async () => {
    if (!window.confirm('Create new random trios for today?')) return;
    
    setRandomizing(true);
    try {
      await supabase.rpc('randomize_trios');
      toast({ title: 'Trios randomized!' });
    } catch (error) {
      toast({ title: 'Failed to randomize', variant: 'destructive' });
    } finally {
      setRandomizing(false);
    }
  };

  const makeAdmin = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('user_id', userId);
      await loadUsers();
      toast({ title: 'User promoted to admin' });
    } catch (error) {
      toast({ title: 'Failed to promote user', variant: 'destructive' });
    }
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const filteredUsers = users.filter(u => 
    searchTerm === '' || 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 py-3 pt-safe">
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center text-blue-600 text-base"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back
            </button>
            <button
              onClick={handleRandomizeTrios}
              disabled={randomizing}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-sm font-medium disabled:opacity-50"
            >
              <Shuffle className="inline h-4 w-4 mr-2" />
              {randomizing ? 'Randomizing...' : 'Randomize Trios'}
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-3 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
              <div className="text-xs text-gray-500">Users</div>
            </div>
            <div className="border-x border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{totalTrios}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalMessages}</div>
              <div className="text-xs text-gray-500">Messages</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl text-base border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        {/* Users List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">
            All Users ({filteredUsers.length})
          </h2>
          
          {filteredUsers.map((user) => {
            const isExpanded = expandedUserId === user.user_id;
            
            return (
              <div 
                key={user.user_id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* User Row - Always Visible */}
                <button
                  onClick={() => toggleExpanded(user.user_id)}
                  className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username}
                        className="h-12 w-12 rounded-full object-cover"
                        onError={(e) => {
                          // Fallback to initials on image error
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-lg ${user.avatar_url ? 'hidden' : ''}`}>
                      {user.username?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">@{user.username}</span>
                        {user.is_admin && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 text-right">
                    {user.phone ? formatPhoneNumber(user.phone) : 'No phone'}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                    <div className="space-y-4">
                      {/* Personal Info */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Personal Info</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Birthday</span>
                            <span className="text-gray-900">
                              {user.birthday ? formatDate(user.birthday) : 'Not provided'}
                              {user.age && ` (${user.age} years)`}
                            </span>
                          </div>
                          {user.first_name && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Name</span>
                              <span className="text-gray-900">
                                {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Joined</span>
                            <span className="text-gray-900">{formatDate(user.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Activity Stats */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Activity</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white rounded-xl p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{user.total_posts}</div>
                            <div className="text-xs text-gray-500">Posts</div>
                          </div>
                          <div className="bg-white rounded-xl p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{user.total_messages}</div>
                            <div className="text-xs text-gray-500">Messages</div>
                          </div>
                          <div className="bg-white rounded-xl p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{user.total_friends}</div>
                            <div className="text-xs text-gray-500">Friends</div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {!user.is_admin && (
                        <div className="pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              makeAdmin(user.user_id);
                            }}
                            className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                          >
                            Make Admin
                          </button>
                        </div>
                      )}

                      {/* User ID */}
                      <div className="text-xs text-gray-400 text-center pt-2">
                        ID: {user.user_id}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminClean;