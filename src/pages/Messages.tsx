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
import { ArrowLeft, ArrowUp, MessageSquare, Users, Plus, Camera, Image as ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import MessageUserSearch from '@/components/MessageUserSearch';
import { SwipeableConversationItem } from '@/components/SwipeableConversationItem';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  edited_at?: string;
  read_at?: string;
  image_url?: string;
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
  // ALL hooks must be called at the top level, before any returns
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isUserOnline, getUserPresenceText, isUserCurrentlyActive } = usePresence();
  const { refreshCount: refreshMessageCount } = useMessageNotifications();
  // Removed messagesEndRef - using scrollAreaRef directly for scrolling
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{messageId: string, x: number, y: number} | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  // Track read receipts globally for messages I sent
  const [readReceipts, setReadReceipts] = useState<Map<string, {is_read: boolean, read_at?: string}>>(new Map());
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Prevent page scrolling when Messages is open
  useEffect(() => {
    // Save original styles
    const originalOverflow = document.body.style.overflow;
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore original style
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle keyboard show/hide on iOS
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      // Check if we're at or near the bottom before keyboard shows
      if (scrollAreaRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        setKeyboardHeight(info.keyboardHeight);
        
        // If we were near bottom, smooth scroll to keep messages visible
        if (isNearBottom) {
          setTimeout(() => {
            if (scrollAreaRef.current) {
              scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }
          }, 100);
        }
      } else {
        setKeyboardHeight(info.keyboardHeight);
      }
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Poll for read receipt updates every 2 seconds
  useEffect(() => {
    if (!user || !selectedConversation) return;
    
    const pollInterval = setInterval(async () => {
      // Get ALL messages I sent in this conversation, not just read ones
      const { data } = await supabase
        .from('messages')
        .select('id, is_read, read_at')
        .eq('conversation_id', selectedConversation.id)
        .eq('sender_id', user.id);
      
      if (data && data.length > 0) {
        setReadReceipts(prev => {
          const newMap = new Map(prev);
          data.forEach(msg => {
            newMap.set(msg.id, {
              is_read: msg.is_read,
              read_at: msg.read_at
            });
          });
          return newMap;
        });
        
        // Update local messages too
        setMessages(prev => prev.map(msg => {
          if (msg.sender_id === user.id) {
            const updated = data.find(d => d.id === msg.id);
            if (updated) {
              return { ...msg, is_read: updated.is_read, read_at: updated.read_at };
            }
          }
          return msg;
        }));
      }
    }, 5000); // Poll every 5 seconds instead of 500ms to reduce load
    
    return () => clearInterval(pollInterval);
  }, [user, selectedConversation]);
  
  // Load conversations and handle URL params
  useEffect(() => {
    // Wait for auth to load first
    if (authLoading) {
      console.log('[MESSAGES] Waiting for auth to load...');
      return;
    }
    
    if (!user) {
      console.log('[MESSAGES] No user authenticated, redirecting to auth...');
      setLoading(false);
      navigate('/auth');
      return;
    }
    
    console.log('[MESSAGES] User authenticated, loading conversations...');
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
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages'
            // Remove filter - listen to ALL updates and filter in code
          },
          (payload) => {
            const updatedMsg = payload.new as Message;
            
            // Only track read receipts for messages I sent
            if (updatedMsg.sender_id === user.id) {
              // Track read receipts globally
              setReadReceipts(prev => {
                const newMap = new Map(prev);
                newMap.set(updatedMsg.id, {
                  is_read: updatedMsg.is_read,
                  read_at: updatedMsg.read_at
                });
                return newMap;
              });
            }
            
            // Always update local messages if they're in the current view
            setMessages(prev => prev.map(msg => 
              msg.id === updatedMsg.id 
                ? { ...msg, is_read: updatedMsg.is_read, read_at: updatedMsg.read_at }
                : msg
            ));
          }
        )
        .subscribe();
      
      return () => {
        channel.unsubscribe();
      };
  }, [user, authLoading, navigate]);

  // Handle conversation from URL params or user profile navigation
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    const userId = searchParams.get('user');
    
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
    } else if (userId && !loading && conversations.length > 0) {
      // Handle navigation from user profile with user ID
      handleUserNavigation(userId);
    }
  }, [searchParams, conversations, loading]);

  // Re-load messages when read receipts update
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      // Update existing messages with new read receipts
      setMessages(prev => prev.map(msg => {
        const receipt = readReceipts.get(msg.id);
        if (receipt && msg.sender_id === user?.id) {
          return { ...msg, is_read: receipt.is_read, read_at: receipt.read_at };
        }
        return msg;
      }));
    }
  }, [readReceipts, selectedConversation, user]);

  // Load messages and subscribe to real-time updates when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // Reset scroll state when changing conversations
      setUserScrolledUp(false);
      setIsInitialLoad(true);
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
                const readTimestamp = new Date().toISOString();
                supabase
                  .from('messages')
                  .update({ 
                    is_read: true,
                    read_at: readTimestamp 
                  })
                  .eq('id', updatedMsg.id)
                  .then(() => {
                    // Update local state with read timestamp
                    setMessages(prev => prev.map(msg => 
                      msg.id === updatedMsg.id 
                        ? { ...msg, is_read: true, read_at: readTimestamp }
                        : msg
                    ));
                  });
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

  // Auto-scroll to bottom only for new messages when user is already at bottom
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    // Only scroll to bottom on initial conversation load, not on every message update
    if (isInitialLoad && messages.length > 0 && scrollAreaRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current;
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
        setIsInitialLoad(false);
      }, 100);
    }
  }, [selectedConversation?.id]); // Only trigger on conversation change, not message updates
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    setUserScrolledUp(!isAtBottom);
  };

  // Close context menu when switching conversations or on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      setContextMenu(null);
    };
  }, [selectedConversation, longPressTimer]);

  const deleteConversation = async (conversationId: string) => {
    try {
      // Delete all messages in the conversation first
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        throw messagesError;
      }

      // Delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        throw conversationError;
      }

      // Update local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // Clear selection if this was the selected conversation
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      // Refresh message count
      refreshMessageCount();

      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed',
      });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete conversation',
        variant: 'destructive'
      });
      throw error; // Re-throw to handle in the component
    }
  };

  const handleUserNavigation = async (targetUserId: string) => {
    try {
      // First check if we already have a conversation with this user
      const existingConv = conversations.find(conv => {
        const otherUserId = conv.user1_id === user?.id ? conv.user2_id : conv.user1_id;
        return otherUserId === targetUserId;
      });
      
      if (existingConv) {
        // Open existing conversation
        setSelectedConversation(existingConv);
        return;
      }
      
      // No existing conversation, create a new one
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          user1_id: user?.id,
          user2_id: targetUserId
        })
        .select()
        .single();
        
      if (createError) {
        // Conversation might already exist (race condition or unique constraint)
        // Try to fetch it
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .or(`and(user1_id.eq.${user?.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user?.id})`)
          .single();
          
        if (existingConv) {
          // Get the other user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('user_id', targetUserId)
            .single();
            
          const convWithProfile = {
            ...existingConv,
            other_user: profile,
            last_message: null,
            last_message_at: null,
            unread_count: 0
          };
          
          setConversations(prev => [...prev, convWithProfile]);
          setSelectedConversation(convWithProfile);
        }
        return;
      }
      
      if (newConv) {
        // Get the other user's profile for the new conversation
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('user_id', targetUserId)
          .single();
          
        const convWithProfile = {
          ...newConv,
          other_user: profile,
          last_message: null,
          last_message_at: null,
          unread_count: 0
        };
        
        // Add to conversations list and select it
        setConversations(prev => [...prev, convWithProfile]);
        setSelectedConversation(convWithProfile);
      }
    } catch (error) {
      console.error('Error handling user navigation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    }
  };

  const loadConversations = async () => {
    try {
      if (!user?.id) {
        console.error('[MESSAGES] No user ID available, user object:', user);
        // Don't set loading to false here - wait for auth to load
        return;
      }

      console.log('[MESSAGES] Loading conversations for user:', user.id);

      // Load conversations with profiles in separate queries for now
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      console.log('Found conversations:', convs?.length || 0);

      // Load profiles and messages for each conversation
      const conversationsWithProfiles = await Promise.all((convs || []).map(async (conv) => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        
        // Get other user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .eq('user_id', otherUserId)
          .single();
        
        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);
        
        console.log(`Conversation ${conv.id} has ${unreadCount} unread messages`);

        return {
          ...conv,
          other_user: profile || {
            id: otherUserId,
            username: 'Unknown User',
            avatar_url: null
          },
          last_message: lastMessage?.content,
          last_message_at: lastMessage?.created_at,
          unread_count: unreadCount || 0
        };
      }));

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
      
      // Merge with global read receipts
      const messagesWithReceipts = (data || []).map(msg => {
        const receipt = readReceipts.get(msg.id);
        if (receipt && msg.sender_id === user?.id) {
          return { ...msg, is_read: receipt.is_read, read_at: receipt.read_at };
        }
        return msg;
      });
      
      setMessages(messagesWithReceipts);
      
      // Smooth scroll to bottom after loading messages
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
      
      // Mark ALL messages in this conversation as read for the current user
      if (data && data.length > 0) {
        // Batch update all unread messages from the other person
        const readTimestamp = new Date().toISOString();
        
        const { data: updatedMessages } = await supabase
          .from('messages')
          .update({ 
            is_read: true,
            read_at: readTimestamp 
          })
          .eq('conversation_id', conversationId)
          .eq('is_read', false)
          .neq('sender_id', user?.id)
          .select();
        
        if (updatedMessages) {
          // Update local state with the read timestamp
          setMessages(prev => prev.map(msg => {
            const updated = updatedMessages.find(um => um.id === msg.id);
            return updated ? { ...msg, is_read: true, read_at: readTimestamp } : msg;
          }));
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

  const compressImage = async (dataUrl: string): Promise<Blob> => {
    // This shrinks images from 5MB to ~200KB
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 1080;  // Instagram story size
    const MAX_HEIGHT = 1920;
    
    // Calculate new dimensions
    let width = img.width;
    let height = img.height;
    
    if (width > height) {
      if (width > MAX_WIDTH) {
        height = height * (MAX_WIDTH / width);
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width = width * (MAX_HEIGHT / height);
        height = MAX_HEIGHT;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw and compress
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    
    // 0.85 quality = good enough, much smaller
    return new Promise(resolve => 
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85)
    );
  };

  const sendPhotoMessage = async (imageDataUrl: string) => {
    if (!selectedConversation || sending) return;

    setSending(true);
    
    try {
      // Convert data URL to compressed blob
      const blob = await compressImage(imageDataUrl);
      
      // Upload to Supabase storage
      const fileName = `${user?.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Send message with image - try with image_url first
      let { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          content: '📷 Photo',
          image_url: publicUrl,
          is_read: false
        })
        .select()
        .single();

      // If image_url column doesn't exist, try without it
      if (error && error.message.includes('column')) {
        console.log('image_url column not available, sending photo URL in content');
        const fallbackResult = await supabase
          .from('messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender_id: user?.id,
            content: `📷 Photo: ${publicUrl}`,
            is_read: false
          })
          .select()
          .single();
        
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;

      // Add message to local state
      setMessages(prev => [...prev, data]);
      
      // Smooth scroll to bottom after sending
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
      
      // Reload conversations
      setTimeout(() => {
        loadConversations();
      }, 100);
      
      toast({
        title: 'Photo sent!',
        description: 'Your photo has been shared'
      });
      
    } catch (error) {
      console.error('Error sending photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to send photo',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
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
      
      // Smooth scroll to bottom after sending a message
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
      
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

  // Long press handlers - simplified
  const handleLongPress = (e: React.TouchEvent | React.MouseEvent, messageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get touch/mouse position
    let x = 0, y = 0;
    if ('touches' in e) {
      const touch = (e as React.TouchEvent).touches[0];
      x = touch.clientX;
      y = touch.clientY;
    } else {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }
    
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Set timer for long press (500ms)
    const timer = setTimeout(() => {
      // Add haptic feedback for mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      setContextMenu({ messageId, x, y });
      setLongPressTimer(null);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">
          {authLoading ? 'Authenticating...' : 'Loading messages...'}
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Please log in to view messages</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Conversations List */}
      <div className={`border-r flex flex-col h-full ${selectedConversation ? 'hidden md:flex md:w-96' : 'w-full md:w-96'}`}>
        <header className="bg-background border-b flex-shrink-0">
          <div className="px-4 pb-4 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-lg font-bold">Messages</h1>
            </div>
            <div className="flex items-center gap-2">
              <MessageUserSearch />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
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
              <SwipeableConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedConversation?.id === conv.id}
                onClick={() => {
                  setSelectedConversation(conv);
                  // DON'T clear visuals immediately - wait for database confirmation
                }}
                onDelete={deleteConversation}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col h-full relative">
          {/* Fixed Header */}
          <header className="absolute top-0 left-0 right-0 bg-background border-b z-10">
            <div className="px-4 pb-3 pt-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden flex-shrink-0"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="relative flex-shrink-0">
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
                    <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                  )}
                </div>
                <div 
                  className="cursor-pointer flex-1 min-w-0"
                  onClick={() => navigate(`/user/${selectedConversation.other_user?.id}`)}
                >
                  <p className="font-medium truncate">@{selectedConversation.other_user?.username || 'Unknown'}</p>
                  <p className="text-xs">
                    {selectedConversation.other_user?.id && isUserOnline(selectedConversation.other_user.id) ? (
                      <span className="text-green-500 font-medium">● Active now</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {selectedConversation.other_user?.id 
                          ? getUserPresenceText(selectedConversation.other_user.id)
                          : 'Offline'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Messages Area with padding for fixed header and input */}
          <div 
            ref={scrollAreaRef}
            className="absolute inset-0 overflow-y-auto overscroll-none"
            onScroll={handleScroll}
            style={{ 
              WebkitOverflowScrolling: 'touch',
              paddingTop: '130px', // Height of header with Dynamic Island (increased)
              paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 80}px` : '120px' // Add keyboard height + input bar height
            }}
          >
            <div className="space-y-4 px-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  const isEditing = editingMessage === message.id;
                  
                  // Check BOTH the message state AND the readReceipts Map
                  const receipt = readReceipts.get(message.id);
                  const isRead = receipt?.is_read || message.is_read;
                  const readAt = receipt?.read_at || message.read_at;
                  
                  // Only show "Read" on the last read message from this sender
                  const nextMessage = messages[index + 1];
                  const nextReceipt = nextMessage ? readReceipts.get(nextMessage.id) : null;
                  const nextIsRead = nextMessage ? (nextReceipt?.is_read || nextMessage.is_read) : false;
                  
                  const showReadStatus = isOwn && isRead && 
                    (!nextMessage || nextMessage.sender_id !== user?.id || !nextIsRead);
                  
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
                        onTouchStart={isOwn ? (e) => handleLongPress(e, message.id) : undefined}
                        onTouchEnd={isOwn && !contextMenu ? cancelLongPress : undefined}
                        onTouchMove={isOwn && !contextMenu ? cancelLongPress : undefined}
                        onTouchCancel={isOwn && !contextMenu ? cancelLongPress : undefined}
                        style={{ 
                          userSelect: isOwn ? 'none' : 'auto',
                          WebkitTouchCallout: isOwn ? 'none' : 'default',
                          WebkitUserSelect: isOwn ? 'none' : 'auto'
                        }}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="text-sm bg-background/10 border-none focus:ring-1 focus:ring-white/50"
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
                            {message.image_url || (message.content && message.content.includes('Photo: http')) ? (
                              <div className="space-y-2">
                                <img 
                                  src={message.image_url || message.content.split('Photo: ')[1]} 
                                  alt="Shared photo" 
                                  className="rounded-lg max-w-[200px] max-h-[200px] object-cover cursor-pointer"
                                  onClick={() => window.open(message.image_url || message.content.split('Photo: ')[1], '_blank')}
                                />
                                {message.content && !message.content.includes('Photo: http') && message.content !== '📷 Photo' && (
                                  <p className="text-sm">{message.content}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm">{message.content}</p>
                            )}
                            <p className={`text-[9px] mt-1 ${isOwn ? 'text-right' : 'text-left'} ${
                              isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground/70'
                            }`}>
                              {isOwn ? (
                                showReadStatus ? 
                                  (readAt ? `Read ${format(new Date(readAt), 'h:mm a')}` : 'Read') : 
                                  (isRead ? '' : 'Delivered')
                              ) : format(new Date(message.created_at), 'h:mm a')}
                              {message.edited_at && <span className="ml-1">(edited)</span>}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {/* Removed messagesEndRef - using scrollAreaRef directly now */}
            </div>
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-40 bg-black/5" 
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  closeContextMenu();
                }}
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
                        className="w-full px-4 py-2 text-left hover:bg-muted text-sm"
                      >
                        Edit
                      </button>
                      
                      {canUnsendMessage && (
                        <button
                          onClick={() => handleUnsendMessage(contextMenu.messageId)}
                          className="w-full px-4 py-2 text-left hover:bg-muted text-sm text-orange-600"
                        >
                          Unsend
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteMessage(contextMenu.messageId)}
                        className="w-full px-4 py-2 text-left hover:bg-muted text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  );
                })()}
              </div>
            </>
          )}

          {/* Fixed Input Area - Rises with keyboard */}
          <div 
            className="absolute left-0 right-0 border-t bg-background z-50 transition-all duration-300"
            style={{ 
              bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0',
              paddingBottom: keyboardHeight > 0 ? '0' : 'env(safe-area-inset-bottom)',
              pointerEvents: 'auto'
            }}>
            {/* Media Menu Popup */}
            {showMediaMenu && (
              <div className="absolute bottom-full left-0 right-0 bg-background border-t p-4 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Send Photo</p>
                  <button
                    onClick={() => setShowMediaMenu(false)}
                    className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      setShowMediaMenu(false);
                      // Import Camera from Capacitor
                      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
                      try {
                        const image = await Camera.getPhoto({
                          quality: 90,
                          allowEditing: false,
                          resultType: CameraResultType.DataUrl,
                          source: CameraSource.Camera
                        });
                        if (image.dataUrl) {
                          await sendPhotoMessage(image.dataUrl);
                        }
                      } catch (error) {
                        console.error('Camera error:', error);
                      }
                    }}
                    className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Camera className="h-6 w-6 mb-2" />
                    <span className="text-sm">Camera</span>
                  </button>
                  <button
                    onClick={async () => {
                      setShowMediaMenu(false);
                      // Import Camera from Capacitor
                      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
                      try {
                        const image = await Camera.getPhoto({
                          quality: 90,
                          allowEditing: false,
                          resultType: CameraResultType.DataUrl,
                          source: CameraSource.Photos
                        });
                        if (image.dataUrl) {
                          await sendPhotoMessage(image.dataUrl);
                        }
                      } catch (error) {
                        console.error('Photo library error:', error);
                      }
                    }}
                    className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <ImageIcon className="h-6 w-6 mb-2" />
                    <span className="text-sm">Photo Library</span>
                  </button>
                </div>
              </div>
            )}
            
            <div className="p-3 flex items-center gap-2">
              {/* Plus Button */}
              <button
                onClick={() => setShowMediaMenu(!showMediaMenu)}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                  showMediaMenu ? 'rotate-45 bg-primary text-white' : 'bg-muted hover:bg-muted/80'
                }`}
                type="button"
              >
                <Plus className="h-5 w-5" />
              </button>
              
              {/* Message Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!sending && newMessage.trim()) {
                    sendMessage();
                  }
                }}
                className="relative flex-1"
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
                  className="pr-12 rounded-full bg-muted/50"
                />
                <button 
                  type="button" 
                  disabled={sending || !newMessage.trim()}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!sending && newMessage.trim()) {
                      sendMessage();
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Desktop fallback
                    if (!('ontouchstart' in window) && !sending && newMessage.trim()) {
                      sendMessage();
                    }
                  }}
                  className="absolute h-8 w-8 rounded-full flex items-center justify-center bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  style={{ 
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    touchAction: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    pointerEvents: 'auto'
                  }}
                >
                  <ArrowUp className="h-5 w-5 pointer-events-none" />
                </button>
              </form>
            </div>
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