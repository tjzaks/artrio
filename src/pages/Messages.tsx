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
  edited_at?: string;
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
  unread_count?: number;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isUserOnline, getUserPresenceText, isUserCurrentlyActive } = usePresence();
  const { refreshCount: refreshMessageCount } = useMessageNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{messageId: string, x: number, y: number} | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Load conversations and handle URL params
  useEffect(() => {
    if (user) {
      loadConversations();
      
      // Set up a single global subscription for ALL messages
      const channel = supabase
        .channel('all-messages-unified')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            const newMsg = payload.new as Message;
            
            // Always update conversations list
            setConversations(prev => {
              const updated = prev.map(conv => {
                if (conv.id === newMsg.conversation_id) {
                  return {
                    ...conv,
                    last_message: newMsg.content,
                    last_message_at: newMsg.created_at
                  };
                }
                return conv;
              });
              
              // Reorder by most recent
              return updated.sort((a, b) => {
                if (!a.last_message_at && !b.last_message_at) return 0;
                if (!a.last_message_at) return 1;
                if (!b.last_message_at) return -1;
                return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
              });
            });
            
            // Refresh the notification count for all pages
            refreshMessageCount();
          }
        )
        .subscribe();
      
      return () => {
        channel.unsubscribe();
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
            event: '*', // Listen to INSERT and UPDATE
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation.id}`
          },
          (payload) => {
            const updatedMsg = payload.new as Message;
            
            if (payload.eventType === 'INSERT') {
              // Add ANY new message to the current conversation view
              setMessages(prev => {
                if (prev.some(m => m.id === updatedMsg.id)) {
                  return prev;
                }
                return [...prev, updatedMsg];
              });
              
              // Mark as read if it's from someone else and conversation is open
              if (updatedMsg.sender_id !== user?.id) {
                supabase
                  .from('messages')
                  .update({ is_read: true })
                  .eq('id', updatedMsg.id);
              }
            } else if (payload.eventType === 'UPDATE') {
              // Handle message edits and read status updates
              setMessages(prev => prev.map(msg => 
                msg.id === updatedMsg.id ? updatedMsg : msg
              ));
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

  // Close context menu when switching conversations or on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      setContextMenu(null);
    };
  }, [selectedConversation, longPressTimer]);

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

          // Get unread count from notification_counts table (much simpler!)
          const { data: unreadData } = await supabase
            .from('notification_counts')
            .select('unread_count')
            .eq('user_id', user?.id)
            .eq('conversation_id', conv.id)
            .single();
          
          const unreadCount = unreadData?.unread_count || 0;
          console.log(`Conversation ${conv.id} has ${unreadCount} unread messages (from notification_counts)`);

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
            last_message_at: lastMsg?.created_at,
            unread_count: unreadCount || 0
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
        // Mark all unread messages from the other person as read
        const unreadMessages = data.filter(m => !m.is_read && m.sender_id !== user?.id);
        
        if (unreadMessages.length > 0) {
          // Mark them as read in the database
          const { error: readError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessages.map(m => m.id));
          
          if (!readError) {
            // Update local state to show as read
            setMessages(prev => prev.map(msg => 
              unreadMessages.some(um => um.id === msg.id) 
                ? { ...msg, is_read: true }
                : msg
            ));
          }
        }
        
        // Reset unread count using simple notification system
        
        const { data: result, error: updateError } = await supabase
          .rpc('reset_unread_count', { 
            p_user_id: user?.id, 
            p_conversation_id: conversationId 
          });
        
        if (updateError) {
          console.error('[MESSAGES] ERROR resetting unread count:', updateError);
        } else {
          console.log('[MESSAGES] SUCCESS - reset unread count:', result);
          // Clear visuals immediately since notification system handles it
          setConversations(prev => prev.map(c => 
            c.id === conversationId ? { ...c, unread_count: 0 } : c
          ));
          refreshMessageCount();
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


  const startEditing = (message: Message) => {
    setEditingMessage(message.id);
    setEditContent(message.content);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const saveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;
    
    try {
      const { data, error } = await supabase.rpc('edit_message', {
        p_message_id: editingMessage,
        p_user_id: user?.id,
        p_new_content: editContent.trim()
      });
      
      if (error) {
        console.error('Error editing message:', error);
        toast({
          title: 'Error',
          description: 'Failed to edit message',
          variant: 'destructive'
        });
        return;
      }
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage 
          ? { ...msg, content: editContent.trim(), edited_at: new Date().toISOString() }
          : msg
      ));
      
      cancelEditing();
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  // Long press handlers
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent, messageId: string) => {
    e.preventDefault();
    
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    // Set timer for long press (500ms)
    const timer = setTimeout(() => {
      // Add haptic feedback for mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      // Get touch/mouse position
      let x = 0, y = 0;
      if ('touches' in e) {
        const touch = e.touches[0];
        x = touch.clientX;
        y = touch.clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      
      setContextMenu({ messageId, x, y });
      // Clear the timer since menu is now open
      setLongPressTimer(null);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    // Only clear timer if menu hasn't opened yet
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    // Don't close the menu here - let user tap to select
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Context menu actions
  const handleEditFromMenu = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      startEditing(message);
    }
    closeContextMenu();
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user?.id);

      if (error) {
        console.error('Error deleting message:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete message',
          variant: 'destructive'
        });
        return;
      }

      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      toast({
        title: 'Message deleted',
        description: 'Message has been permanently deleted'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
    closeContextMenu();
  };

  const handleUnsendMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user?.id);

      if (error) {
        console.error('Error unsending message:', error);
        toast({
          title: 'Error',
          description: 'Failed to unsend message',
          variant: 'destructive'
        });
        return;
      }

      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      toast({
        title: 'Message unsent',
        description: 'Message has been removed for everyone'
      });
    } catch (error) {
      console.error('Error unsending message:', error);
    }
    closeContextMenu();
  };

  // Check if message can be unsent (within 2 minutes)
  const canUnsend = (messageTime: string) => {
    const messageDate = new Date(messageTime);
    const now = new Date();
    const diffMinutes = (now.getTime() - messageDate.getTime()) / (1000 * 60);
    return diffMinutes <= 2;
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
                onClick={() => {
                  setSelectedConversation(conv);
                  // DON'T clear visuals immediately - wait for database confirmation
                }}
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
                    {conv.other_user?.id && isUserCurrentlyActive(conv.other_user.id) && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${conv.unread_count > 0 ? 'text-primary' : ''}`}>
                        @{conv.other_user?.username || 'Unknown'}
                      </p>
                      {conv.unread_count > 0 && (
                        <div className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {conv.last_message || 'Start a conversation'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {conv.last_message_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conv.last_message_at), 'MMM d')}
                      </span>
                    )}
                    {conv.unread_count > 0 && (
                      <div className="h-2 w-2 bg-primary rounded-full" />
                    )}
                  </div>
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
                {selectedConversation.other_user?.id && isUserCurrentlyActive(selectedConversation.other_user.id) && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div 
                className="cursor-pointer"
                onClick={() => navigate(`/user/${selectedConversation.other_user?.id}`)}
              >
                <p className="font-medium">@{selectedConversation.other_user?.username || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.other_user?.id 
                    ? getUserPresenceText(selectedConversation.other_user.id)
                    : 'Unknown status'}
                </p>
              </div>
            </div>
          </div>
          </header>

          <ScrollArea className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  const isEditing = editingMessage === message.id;
                  // Only show "Read" on the last read message from this sender
                  const nextMessage = messages[index + 1];
                  const showReadStatus = isOwn && message.is_read && 
                    (!nextMessage || nextMessage.sender_id !== user?.id || !nextMessage.is_read);
                  
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
                        } ${isOwn ? 'select-none' : ''}`}
                        onTouchStart={isOwn ? (e) => handleLongPressStart(e, message.id) : undefined}
                        onTouchEnd={isOwn ? handleLongPressEnd : undefined}
                        onTouchMove={isOwn ? handleLongPressEnd : undefined}
                        onMouseDown={isOwn ? (e) => handleLongPressStart(e, message.id) : undefined}
                        onMouseUp={isOwn ? handleLongPressEnd : undefined}
                        onMouseLeave={isOwn ? handleLongPressEnd : undefined}
                        style={{ userSelect: isOwn ? 'none' : 'auto' }}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="text-sm bg-background/10 border-none focus:ring-1 focus:ring-white/50"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                className="flex-1 px-2 py-1 text-xs bg-white/20 rounded-md text-white font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="flex-1 px-2 py-1 text-xs bg-white/10 rounded-md text-white/70"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-[9px] mt-1 ${isOwn ? 'text-right' : 'text-left'} ${
                              isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground/70'
                            }`}>
                              {isOwn ? (showReadStatus ? 'Read' : (message.is_read ? '' : 'Delivered')) : format(new Date(message.created_at), 'h:mm a')}
                              {message.edited_at && <span className="ml-1">(edited)</span>}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Context Menu */}
          {contextMenu && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={closeContextMenu}
                onTouchStart={closeContextMenu}
              />
              
              {/* Context menu */}
              <div
                className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-2 min-w-[140px]"
                style={{
                  left: Math.min(contextMenu.x, window.innerWidth - 160),
                  top: Math.max(10, Math.min(contextMenu.y - 50, window.innerHeight - 200))
                }}
              >
                {(() => {
                  const message = messages.find(m => m.id === contextMenu.messageId);
                  if (!message) return null;
                  
                  const canUnsendMessage = canUnsend(message.created_at);
                  
                  return (
                    <>
                      <button
                        onClick={() => handleEditFromMenu(contextMenu.messageId)}
                        className="w-full px-4 py-2 text-left hover:bg-muted text-sm flex items-center gap-2"
                      >
                        <span>✏️</span>
                        Edit
                      </button>
                      
                      {canUnsendMessage && (
                        <button
                          onClick={() => handleUnsendMessage(contextMenu.messageId)}
                          className="w-full px-4 py-2 text-left hover:bg-muted text-sm flex items-center gap-2 text-orange-600"
                        >
                          <span>↩️</span>
                          Unsend
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteMessage(contextMenu.messageId)}
                        className="w-full px-4 py-2 text-left hover:bg-muted text-sm flex items-center gap-2 text-red-600"
                      >
                        <span>🗑️</span>
                        Delete
                      </button>
                    </>
                  );
                })()}
              </div>
            </>
          )}

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