import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, Search, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface User {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export default function MessageUserSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (searchQuery.trim()) {
      // Debounce search
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers();
      }, 300);
    } else {
      setUsers([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('user_id', user?.id)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (targetUser: User) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive'
      });
      return;
    }

    if (!targetUser.user_id) {
      toast({
        title: 'Error',
        description: 'Invalid user selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Check if conversation already exists
      const { data: existing, error: queryError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUser.user_id}),and(user1_id.eq.${targetUser.user_id},user2_id.eq.${user.id})`);

      if (queryError) {
        toast({
          title: 'Error finding conversation',
          description: queryError.message,
          variant: 'destructive'
        });
        return;
      }

      let conversationId;
      
      // Check if we found an existing conversation
      if (!existing || existing.length === 0) {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            user1_id: user.id,
            user2_id: targetUser.user_id
          })
          .select()
          .single();
        
        if (error) {
          toast({
            title: 'Failed to create conversation',
            description: error.message,
            variant: 'destructive'
          });
          return;
        }
        conversationId = newConv.id;
      } else {
        conversationId = existing[0].id;
      }

      // Close popover
      setOpen(false);
      setSearchQuery('');
      setUsers([]);
      
      // Force reload to ensure conversation appears
      window.location.href = `/messages?conversation=${conversationId}`;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start conversation',
        variant: 'destructive'
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-3 rounded-xl bg-background/95 backdrop-blur-md border border-white/10 shadow-xl" 
        align="end" 
        sideOffset={5}
      >
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search users to message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 rounded-lg bg-white/5 border border-white/10 focus:bg-white/10 focus:border-white/20 transition-all"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setUsers([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="py-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <div className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-pulse" />
                <div className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-pulse delay-75" />
                <div className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-pulse delay-150" />
              </div>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-0.5">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-blue-500/10 transition-all"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">Type to search for users</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}