import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { usePresence } from '@/hooks/usePresence';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ClickableAvatar from '@/components/ClickableAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import MessageUserSearch from '@/components/MessageUserSearch';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  other_user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_message?: string;
  last_message_at?: string;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isUserOnline } = usePresence();
  const { refreshCount: refreshMessageCount } = useMessageNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load conversations and handle URL params
  useEffect(() => {
    if (user) {
      loadConversations();
      const unsubscribe = subscribeToMessages();
      
      // Don't clear notifications here - only when a specific conversation is opened
      // clearAllNotifications();
      
      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  // Handle conversation from URL params
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    
    if (conversationId) {
      // If conversations are loaded, select the one from URL
      if (conversations.length > 0) {
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          setSelectedConversation(conv);
        }
      }
      // If conversation ID exists but conversations aren't loaded or conversation not found
      // This happens when navigating from the search dropdown
      else if (!loading) {
        loadConversations();
      }
    }
  }, [searchParams, conversations, loading]);

  // Load messages and subscribe to real-time updates when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      
      // Subscribe to real-time updates for this specific conversation
      const channel = supabase
        .channel(`conversation-${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation.id}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            console.log('New message in conversation:', newMsg);
            
            // Add message to the list if it's not from the current user
            // (messages from current user are already added when sending)
            if (newMsg.sender_id !== user?.id) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          }
        )
        .subscribe();
      
      return () => {
        channel.unsubscribe();
      };
    }
  }, [selectedConversation, user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      if (!user?.id) {
        console.error('No user ID available');
        setLoading(false);
        return;
      }

      console.log('Loading conversations for user:', user.id);

      // Get all conversations for this user
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching conversations:', error);
        console.error('Query was:', `user1_id.eq.${user.id},user2_id.eq.${user.id}`);
        throw error;
      }

      console.log('Found conversations:', convs?.length || 0);

      // For each conversation, get the other user's profile
      const conversationsWithProfiles = await Promise.all(
        (convs || []).map(async (conv) => {
          const otherUserId = conv.user1_id === user?.id ? conv.user2_id : conv.user1_id;
          
          // Get other user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .eq('user_id', otherUserId)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            other_user: profile ? {
              id: profile.user_id,
              username: profile.username,
              avatar_url: profile.avatar_url
            } : {
              id: otherUserId,
              username: 'Unknown User',
              avatar_url: null
            },
            last_message: lastMsg?.content,
            last_message_at: lastMsg?.created_at
          };
        })
      );

      // Sort conversations by last message timestamp (most recent first)
      const sortedConversations = conversationsWithProfiles.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
      
      setConversations(sortedConversations);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      // Only show toast for actual errors, not empty results
      if (error && error.code !== 'PGRST116') {
        // Don't show error toast, just log it
        console.error('Failed to load conversations:', error.message);
      }
      setConversations([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    console.log(`[MESSAGES] Loading messages for conversation: ${conversationId}`);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load messages',
          variant: 'destructive'
        });
        return;
      }
      
      console.log(`[MESSAGES] Loaded ${data?.length || 0} messages`);
      setMessages(data || []);
      
      // Mark ALL messages in this conversation as read for the current user
      if (data && data.length > 0) {
        // First, let's see what messages need to be marked as read
        const unreadMessages = data.filter(m => !m.is_read && m.sender_id !== user?.id);
        console.log(`[MESSAGES] Found ${unreadMessages.length} unread messages from other users`);
        console.log('[MESSAGES] Unread messages:', unreadMessages.map(m => ({
          id: m.id,
          content: m.content.substring(0, 20),
          sender_id: m.sender_id,
          is_read: m.is_read
        })));
        
        if (unreadMessages.length > 0) {
          console.log(`[MESSAGES] Attempting to mark ${unreadMessages.length} messages as read...`);
          const { data: updatedData, error: updateError, count } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .eq('is_read', false)
            .neq('sender_id', user?.id) // Only mark messages from other users as read
            .select();
          
          if (updateError) {
            console.error('[MESSAGES] ERROR marking messages as read:', updateError);
            toast({
              title: 'Warning',
              description: 'Could not mark messages as read',
              variant: 'destructive'
            });
          } else {
            console.log(`[MESSAGES] SUCCESS: Marked ${count} messages as read`);
            console.log('[MESSAGES] Updated messages:', updatedData);
            
            // Force refresh the notification count
            refreshMessageCount();
          }
        } else {
          console.log('[MESSAGES] No unread messages to mark');
        }
      } else {
        console.log('[MESSAGES] No messages in conversation');
      }
        
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load messages',
        variant: 'destructive'
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageContent = newMessage.trim();
    setSending(true);
    setNewMessage(''); // Clear input immediately for better UX
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          content: messageContent,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;

      // Add message to local state immediately
      setMessages(prev => [...prev, data]);
      
      // Don't reload conversations immediately - let real-time handle it
      // This prevents the conversation list from jumping around
      setTimeout(() => {
        loadConversations();
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  // Function to manually clear all unread messages (for debugging)
  const clearAllUnreadMessages = async () => {
    if (!user) return;
    
    try {
      console.log('=== MANUALLY CLEARING ALL UNREAD MESSAGES ===');
      
      // Get all conversations for this user
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (userConversations && userConversations.length > 0) {
        const conversationIds = userConversations.map(c => c.id);
        
        // Mark all messages as read
        const { error, count } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('conversation_id', conversationIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .select();
        
        if (error) {
          console.error('Error clearing unread messages:', error);
          toast({
            title: 'Error',
            description: 'Failed to clear unread messages',
            variant: 'destructive'
          });
        } else {
          console.log(`Successfully cleared ${count} unread messages`);
          toast({
            title: 'Success',
            description: `Cleared ${count} unread messages`,
          });
          // Force refresh the home page notification count
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error in clearAllUnreadMessages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as Message;
          console.log('New message received:', newMsg);
          
          // Add to messages if it's for the current conversation
          setMessages(prev => {
            // Check if message already exists
            if (prev.some(m => m.id === newMsg.id)) return prev;
            // Add message to the list
            return [...prev, newMsg];
          });
          
          // Refresh conversations to update last message
          loadConversations();
        }
      )
      .subscribe();

    console.log('Subscribed to messages channel');

    return () => {
      console.log('Unsubscribing from messages channel');
      channel.unsubscribe();
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex overflow-hidden">
      {/* Conversations List */}
      <div className={`border-r flex flex-col h-full ${selectedConversation ? 'hidden md:flex md:w-96' : 'w-full md:w-96'}`}>
        <header className="bg-background p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-bold">Messages</h1>
            </div>
            <div className="flex items-center gap-2">
              <MessageUserSearch />
              {/* Debug button - temporary for fixing unread messages issue */}
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllUnreadMessages}
                title="Clear all unread messages (Debug)"
              >
                Clear Unread
              </Button>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No conversations yet</p>
              <Button
                onClick={() => navigate('/friends')}
                variant="outline"
                className="mx-auto"
              >
                <Users className="h-4 w-4 mr-2" />
                Find Friends to Message
              </Button>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-muted/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {conv.other_user ? (
                      <ClickableAvatar
                        userId={conv.other_user.id}
                        username={conv.other_user.username}
                        avatarUrl={conv.other_user.avatar_url}
                        size="md"
                      />
                    ) : (
                      <Avatar>
                        <AvatarFallback>??</AvatarFallback>
                      </Avatar>
                    )}
                    {conv.other_user?.id && isUserOnline(conv.other_user.id) && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">@{conv.other_user?.username || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message || 'Start a conversation'}
                    </p>
                  </div>
                  {conv.last_message_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(conv.last_message_at), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="bg-background p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="relative">
                {selectedConversation.other_user ? (
                  <ClickableAvatar
                    userId={selectedConversation.other_user.id}
                    username={selectedConversation.other_user.username}
                    avatarUrl={selectedConversation.other_user.avatar_url}
                    size="md"
                  />
                ) : (
                  <Avatar>
                    <AvatarFallback>??</AvatarFallback>
                  </Avatar>
                )}
                {selectedConversation.other_user?.id && isUserOnline(selectedConversation.other_user.id) && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div 
                className="cursor-pointer"
                onClick={() => navigate(`/user/${selectedConversation.other_user?.id}`)}
              >
                <p className="font-medium">@{selectedConversation.other_user?.username || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.other_user?.id && isUserOnline(selectedConversation.other_user.id) 
                    ? 'Active now' 
                    : 'Offline'}
                </p>
              </div>
            </div>
            {/* Force mark as read button */}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('[MESSAGES] Force marking all messages as read');
                const { error } = await supabase
                  .from('messages')
                  .update({ is_read: true })
                  .eq('conversation_id', selectedConversation.id)
                  .neq('sender_id', user?.id);
                
                if (error) {
                  console.error('[MESSAGES] Force mark failed:', error);
                } else {
                  console.log('[MESSAGES] Force mark succeeded');
                  refreshMessageCount();
                }
              }}
              className="text-xs"
            >
              Mark Read
            </Button>
          </div>
          </header>

          <ScrollArea className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-[9px] mt-1 text-right ${
                          isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground/70'
                        }`}>
                          {format(new Date(message.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4 flex-shrink-0 bg-background">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!sending && newMessage.trim()) {
                  sendMessage();
                }
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!sending && newMessage.trim()) {
                      sendMessage();
                    }
                  }
                }}
                disabled={sending}
                autoFocus
              />
              <Button type="submit" disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}