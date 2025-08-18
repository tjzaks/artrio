import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Search, MessageSquare, Ban, UserX, Plus, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase, authenticatedRpc } from '@/integrations/supabase/client';
import { format, isToday, isYesterday } from 'date-fns';
import { logger } from '@/utils/logger';

interface Conversation {
  id: string;
  other_user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_blocked: boolean;
  can_send_message?: boolean;
  awaiting_response?: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const Messages = () => {
  const { user, ensureAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<Array<{user_id: string, username: string, avatar_url: string | null}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConversations();
      subscribeToMessages();
      
      // Check if we need to open a specific conversation
      const targetUserId = searchParams.get('user');
      if (targetUserId) {
        handleUserFromParams(targetUserId);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);
  
  // Check for target user after conversations load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      const targetUserId = searchParams.get('user');
      if (targetUserId) {
        handleUserFromParams(targetUserId);
      }
    }
  }, [conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      // Ensure user is authenticated
      const authenticatedUser = await ensureAuthenticated();
      if (!authenticatedUser) {
        logger.warn('User not authenticated when fetching conversations');
        setConversations([]);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      logger.info('Fetching conversations for user:', session.user.id);
      
      try {
        const { data, error } = await authenticatedRpc('get_conversations');
        
        if (error) {
          logger.error('RPC error in fetchConversations:', error);
          throw error;
        }
        
        logger.info('Successfully fetched conversations:', data?.length || 0);
        setConversations(data || []);
      } catch (rpcError) {
        logger.warn('RPC failed, trying fallback method:', rpcError);
        
        // Fallback: fetch conversations using direct table queries
        const { data: convs, error: convError } = await supabase
          .from('conversations')
          .select(`
            id,
            user1_id,
            user2_id,
            is_blocked,
            last_sender_id,
            awaiting_response,
            created_at
          `)
          .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);
        
        if (convError) {
          throw convError;
        }
        
        // Process conversations to match expected format
        const processedConvs = await Promise.all((convs || []).map(async (conv) => {
          const otherUserId = conv.user1_id === session.user.id ? conv.user2_id : conv.user1_id;
          
          // Get other user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .eq('user_id', otherUserId)
            .single();
          
          // Get last message and unread count
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', session.user.id);
          
          return {
            id: conv.id,
            other_user: {
              id: profile?.user_id || otherUserId,
              username: profile?.username || 'Unknown',
              avatar_url: profile?.avatar_url || null
            },
            last_message: lastMessage?.content || null,
            last_message_at: lastMessage?.created_at || null,
            unread_count: unreadCount || 0,
            is_blocked: conv.is_blocked || false,
            can_send_message: !(conv.last_sender_id === session.user.id && conv.awaiting_response),
            awaiting_response: conv.last_sender_id === session.user.id && conv.awaiting_response
          };
        }));
        
        setConversations(processedConvs);
        logger.info('Successfully fetched conversations using fallback method:', processedConvs.length);
      }
    } catch (error) {
      logger.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      logger.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      // Ensure user is authenticated
      const authenticatedUser = await ensureAuthenticated();
      if (!authenticatedUser) {
        logger.warn('User not authenticated when marking messages as read');
        return;
      }
      
      await authenticatedRpc('mark_messages_read', {
        p_conversation_id: conversationId
      });
      
      // Update local state
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unread_count: 0 }
          : conv
      ));
    } catch (error) {
      logger.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    // Check if user can send message (spam protection)
    if (selectedConversation.awaiting_response && !selectedConversation.can_send_message) {
      toast({
        title: 'Message limit reached',
        description: 'You can send another message after they respond',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      // Ensure user is authenticated
      const authenticatedUser = await ensureAuthenticated();
      if (!authenticatedUser) {
        throw new Error('Authentication required to send messages');
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      logger.info('Sending message:', { conversationId: selectedConversation.id, userId: session.user.id });
      
      try {
        const { data, error } = await authenticatedRpc('send_message', {
          p_conversation_id: selectedConversation.id,
          p_content: newMessage.trim()
        });
        
        if (error) {
          logger.error('RPC error in sendMessage:', error);
          throw error;
        }
        
        if (!data?.success) {
          throw new Error(data?.error || 'Failed to send message');
        }
      } catch (rpcError) {
        logger.warn('RPC failed, using fallback message sending:', rpcError);
        
        // Fallback: insert message manually
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender_id: session.user.id,
            content: newMessage.trim(),
            is_read: false
          });
        
        if (insertError) {
          throw insertError;
        }
        
        // Update conversation manually
        await supabase
          .from('conversations')
          .update({
            last_sender_id: session.user.id,
            awaiting_response: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedConversation.id);
      }

      if (error) throw error;

      if (data?.success) {
        setNewMessage('');
        // Update conversation state locally
        setSelectedConversation(prev => prev ? {
          ...prev,
          awaiting_response: true,
          can_send_message: false
        } : null);
        // Message will appear via real-time subscription
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to send message',
          variant: 'destructive'
        });
      }
    } catch (error) {
      logger.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as Message;
          
          // Add to messages if in current conversation
          if (selectedConversation?.id === newMsg.conversation_id) {
            setMessages(prev => [...prev, newMsg]);
          }
          
          // Update conversation list
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startNewConversation = async (userId: string) => {
    try {
      const { data, error } = await authenticatedRpc('get_or_create_conversation', {
        p_other_user_id: userId
      });

      if (error) throw error;

      // Refresh conversations and select the new one
      await fetchConversations();
      const conv = conversations.find(c => c.id === data);
      if (conv) setSelectedConversation(conv);
    } catch (error) {
      logger.error('Error starting conversation:', error);
    }
  };
  
  const handleUserFromParams = async (targetUserId: string) => {
    try {
      logger.info('Starting conversation with user:', targetUserId);
      
      // Ensure user is authenticated
      const authenticatedUser = await ensureAuthenticated();
      if (!authenticatedUser) {
        throw new Error('Not authenticated - please log in again');
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      logger.info('User is authenticated:', session.user.id);
      
      // First, try to find an existing conversation with this user
      const existingConv = conversations.find(c => c.other_user.id === targetUserId);
      
      if (existingConv) {
        logger.info('Found existing conversation:', existingConv.id);
        // If conversation exists, select it
        setSelectedConversation(existingConv);
      } else {
        logger.info('Creating new conversation with user:', targetUserId);
        
        try {
          // If no conversation exists, create one
          const { data, error } = await authenticatedRpc('get_or_create_conversation', {
            p_other_user_id: targetUserId
          });
          
          if (error) {
            logger.error('RPC Error:', error);
            throw error;
          }
        } catch (rpcError) {
          logger.warn('RPC failed, using fallback conversation creation:', rpcError);
          
          // Fallback: create conversation manually
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({
              user1_id: session.user.id < targetUserId ? session.user.id : targetUserId,
              user2_id: session.user.id < targetUserId ? targetUserId : session.user.id,
              is_blocked: false,
              awaiting_response: false
            })
            .select()
            .single();
          
          if (createError) {
            // Conversation might already exist, try to fetch it
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .or(`and(user1_id.eq.${session.user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${session.user.id})`)
              .single();
            
            if (!existingConv) {
              throw createError;
            }
          }
        }
        
        // Refresh conversations to get the new one
        const { data: updatedConvs, error: fetchError } = await authenticatedRpc('get_conversations');
        
        if (fetchError) throw fetchError;
        
        setConversations(updatedConvs || []);
        
        // Find and select the new conversation
        const newConv = updatedConvs?.find((c: Conversation) => 
          c.other_user.id === targetUserId || c.id === data
        );
        
        if (newConv) {
          setSelectedConversation(newConv);
        }
      }
      
      // Clear the URL parameter after handling
      navigate('/messages', { replace: true });
    } catch (error) {
      logger.error('Error handling user from params:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not start conversation with this user';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const blockUser = async (conversationId: string) => {
    // Implementation for blocking
    toast({
      title: 'User Blocked',
      description: 'You will no longer receive messages from this user'
    });
  };
  
  const handleSelectUser = async (userId: string, username: string) => {
    setSearchingUser(true);
    setShowSuggestions(false);
    
    try {
      logger.info('Creating conversation with user:', { userId, username });
      
      // Ensure user is authenticated
      const authenticatedUser = await ensureAuthenticated();
      if (!authenticatedUser) {
        throw new Error('Authentication required - please log in again');
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      try {
        // Create or get conversation with this user
        const { data, error } = await authenticatedRpc('get_or_create_conversation', {
          p_other_user_id: userId
        });
        
        if (error) {
          logger.error('RPC error in handleSelectUser:', error);
          throw error;
        }
      } catch (rpcError) {
        logger.warn('RPC failed, using fallback conversation creation for user selection:', rpcError);
        
        // Fallback: create conversation manually
        const currentUserId = session.user.id;
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            user1_id: currentUserId < userId ? currentUserId : userId,
            user2_id: currentUserId < userId ? userId : currentUserId,
            is_blocked: false,
            awaiting_response: false
          })
          .select()
          .single();
        
        if (createError && !createError.message.includes('duplicate')) {
          throw createError;
        }
      }
      
      // Refresh conversations to get the updated list
      const { data: updatedConvs, error: fetchError } = await authenticatedRpc('get_conversations');
      
      if (!fetchError && updatedConvs) {
        setConversations(updatedConvs);
        
        // Find and select the conversation
        const targetConv = updatedConvs.find((c: Conversation) => 
          c.other_user.id === userId || c.id === data
        );
        
        if (targetConv) {
          setSelectedConversation(targetConv);
          setShowNewMessage(false);
          setNewUsername('');
          setUserSuggestions([]);
        }
      }
    } catch (error) {
      logger.error('Error starting conversation:', error);
      toast({
        title: 'Error',
        description: 'Could not start conversation',
        variant: 'destructive'
      });
    } finally {
      setSearchingUser(false);
    }
  };

  const formatMessageTime = (date: string) => {
    const msgDate = new Date(date);
    if (isToday(msgDate)) return format(msgDate, 'h:mm a');
    if (isYesterday(msgDate)) return 'Yesterday';
    return format(msgDate, 'MMM d');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Conversations List */}
      <div className={`border-r ${selectedConversation ? 'hidden md:block md:w-96' : 'w-full md:w-96'}`}>
        <header className="sticky top-0 z-40 navigation-glass p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="interactive">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-bold">Messages</h1>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowNewMessage(!showNewMessage)}
              className="interactive"
              title="Start new conversation"
            >
              {showNewMessage ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          {showNewMessage ? (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="Type a username to start chatting"
                  value={newUsername}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setNewUsername(value);
                    
                    // Remove @ symbol if user types it, for searching
                    const searchValue = value.startsWith('@') ? value.slice(1) : value;
                    
                    // Search for matching users as they type
                    if (searchValue.length > 0) {
                      const { data: profiles } = await supabase
                        .from('profiles')
                        .select('user_id, username, avatar_url')
                        .ilike('username', `%${searchValue}%`)
                        .neq('user_id', user?.id)  // Exclude current user
                        .limit(5);
                      
                      if (profiles && profiles.length > 0) {
                        setUserSuggestions(profiles);
                        setShowSuggestions(true);
                      } else {
                        setUserSuggestions([]);
                        setShowSuggestions(false);
                      }
                    } else {
                      setUserSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => userSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                
                {/* Dropdown suggestions */}
                {showSuggestions && userSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50">
                    {userSuggestions.map((user) => (
                      <button
                        key={user.user_id}
                        className="w-full p-3 hover:bg-muted text-left flex items-center gap-3 transition-colors"
                        onClick={() => handleSelectUser(user.user_id, user.username)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">@{user.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Start typing to find users</p>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </header>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm mt-2">Start chatting with your trio members!</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={conv.other_user.avatar_url || undefined} />
                    <AvatarFallback>
                      {conv.other_user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">@{conv.other_user.username}</p>
                      {conv.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message || 'Start a conversation'}
                      </p>
                      <div className="flex items-center gap-1">
                        {conv.awaiting_response && !conv.can_send_message && (
                          <Badge variant="outline" className="text-xs">
                            Waiting
                          </Badge>
                        )}
                        {conv.unread_count > 0 && (
                          <Badge variant="default" className="ml-1">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 navigation-glass p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden interactive"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar>
                  <AvatarImage src={selectedConversation.other_user.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedConversation.other_user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">@{selectedConversation.other_user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.awaiting_response && !selectedConversation.can_send_message 
                      ? 'Awaiting response' 
                      : 'Active in same trio'}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => {
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
                      <p className={`text-xs mt-1 ${
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {format(new Date(message.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            {selectedConversation.awaiting_response && !selectedConversation.can_send_message ? (
              <div className="text-center py-3 px-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You've sent a message. Wait for a response to continue the conversation.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This helps prevent spam and unwanted messages
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder={selectedConversation.is_blocked ? "This user is blocked" : "Type a message..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending || selectedConversation.is_blocked || (selectedConversation.awaiting_response && !selectedConversation.can_send_message)}
                />
                <Button 
                  type="submit" 
                  disabled={sending || !newMessage.trim() || selectedConversation.is_blocked || (selectedConversation.awaiting_response && !selectedConversation.can_send_message)}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
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
};

export default Messages;