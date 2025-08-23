import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchResult {
  id: string;
  username: string;
  avatar_url?: string;
  is_friend?: boolean;
  request_pending?: boolean;
}

export default function AddFriend() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Debounce search query for real-time search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search for users by username
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      // Get current user's profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      // Search for users
      const { data: results } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('user_id', user?.id)
        .limit(10);

      if (results && userProfile) {
        // Check friendship status for each result
        const resultsWithStatus = await Promise.all(
          results.map(async (profile) => {
            // Check for friendship in both directions
            const { data: friendship } = await supabase
              .from('friendships')
              .select('status')
              .or(`and(user_id.eq.${userProfile.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${userProfile.id})`)
              .maybeSingle();

            return {
              ...profile,
              is_friend: friendship?.status === 'accepted',
              request_pending: friendship?.status === 'pending'
            };
          })
        );
        
        setSearchResults(resultsWithStatus);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (friendProfileId: string) => {
    console.log('Sending friend request to profile:', friendProfileId);
    console.log('Current user:', user?.id);
    
    try {
      // Get current user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      console.log('User profile result:', { userProfile, profileError });

      if (!userProfile || profileError) {
        console.error('Profile error:', profileError);
        toast({
          title: 'Error',
          description: 'Could not find your profile. Please try logging in again.',
          variant: 'destructive'
        });
        return;
      }

      // Check if friendship already exists
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${userProfile.id},friend_id.eq.${friendProfileId}),and(user_id.eq.${friendProfileId},friend_id.eq.${userProfile.id})`)
        .maybeSingle();

      if (existingFriendship) {
        if (existingFriendship.status === 'pending') {
          toast({
            title: 'Request already sent',
            description: 'Your friend request is pending',
            variant: 'destructive'
          });
        } else if (existingFriendship.status === 'accepted') {
          toast({
            title: 'Already friends',
            description: 'You are already friends with this user',
            variant: 'destructive'
          });
        }
        return;
      }

      console.log('Attempting to insert friendship:', {
        user_id: userProfile.id,
        friend_id: friendProfileId,
        status: 'pending'
      });

      const { data: insertResult, error } = await supabase
        .from('friendships')
        .insert({
          user_id: userProfile.id,
          friend_id: friendProfileId,
          status: 'pending'
        })
        .select();

      if (error) {
        console.error('Friend request error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('Friend request successful:', insertResult);

      toast({
        title: 'Friend request sent!',
        description: 'They will be notified of your request.'
      });

      // Update UI
      setSearchResults(prev => prev.map(r => 
        r.id === friendProfileId ? { ...r, request_pending: true } : r
      ));
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send friend request',
        variant: 'destructive'
      });
    }
  };

  // Load friend suggestions
  const loadSuggestions = async () => {
    try {
      const { data } = await supabase
        .rpc('get_friend_suggestions', { p_user_id: user?.id });
      
      if (data) {
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  // Search automatically when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      searchUsers(debouncedSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]);

  // Navigate to user profile when clicking on a result
  const handleUserClick = (username: string) => {
    navigate(`/user/${username}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Friends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">Search Results</h3>
            {searchResults.map(result => (
              <div key={result.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                <div 
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => handleUserClick(result.username)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={result.avatar_url} />
                    <AvatarFallback>
                      {result.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">@{result.username}</span>
                </div>
                
                {result.is_friend ? (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Check className="h-4 w-4" /> Friends
                  </span>
                ) : result.request_pending ? (
                  <span className="text-sm text-muted-foreground">Pending</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => sendFriendRequest(result.id)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">People You May Know</h3>
            {suggestions.map(suggestion => (
              <div key={suggestion.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                <div 
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => handleUserClick(suggestion.username)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={suggestion.avatar_url} />
                    <AvatarFallback>
                      {suggestion.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">@{suggestion.username}</span>
                    <span className="text-xs text-muted-foreground">Past trio member</span>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => sendFriendRequest(suggestion.id)}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}