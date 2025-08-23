import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ClickableAvatar from '@/components/ClickableAvatar';
import { format } from 'date-fns';
import { usePresence } from '@/hooks/usePresence';
import { Capacitor } from '@capacitor/core';

interface SwipeableConversationItemProps {
  conversation: {
    id: string;
    other_user?: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
    last_message?: string;
    last_message_at?: string;
    unread_count?: number;
  };
  isSelected: boolean;
  onClick: () => void;
  onDelete: (conversationId: string) => Promise<void>;
}

export const SwipeableConversationItem: React.FC<SwipeableConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
  onDelete
}) => {
  const [swipeX, setSwipeX] = useState(0);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const { isUserOnline } = usePresence();
  
  const SWIPE_THRESHOLD = 60; // pixels to reveal delete button
  const DELETE_BUTTON_WIDTH = 80; // width of delete button
  
  // Log presence status for debugging
  useEffect(() => {
    if (conversation.other_user) {
      const online = isUserOnline(conversation.other_user.id);
      console.log(`[CONVERSATION] ${conversation.other_user.username} is ${online ? '🟢 ONLINE' : '⚫ OFFLINE'}`);
    }
  }, [conversation.other_user, isUserOnline]);
  
  // Check if we're on iOS
  const isIOS = () => {
    return Capacitor.getPlatform() === 'ios';
  };

  useEffect(() => {
    // Only enable swipe on iOS
    if (!isIOS()) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      swipeStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!swipeStartRef.current) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeStartRef.current.x;
      const deltaY = touch.clientY - swipeStartRef.current.y;
      
      // Check if swipe is mostly horizontal
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault(); // Prevent scrolling
        
        // Only allow left swipe (negative deltaX)
        if (deltaX < 0) {
          const swipeDistance = Math.min(Math.abs(deltaX), DELETE_BUTTON_WIDTH);
          setSwipeX(-swipeDistance);
          setShowDelete(swipeDistance >= SWIPE_THRESHOLD);
        } else if (swipeX < 0) {
          // Allow swiping back to close
          setSwipeX(Math.max(deltaX + swipeX, 0));
          setShowDelete(false);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!swipeStartRef.current) return;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - swipeStartRef.current.x;
      const deltaTime = Date.now() - swipeStartRef.current.time;
      const velocity = Math.abs(deltaX) / deltaTime;
      
      // Snap to delete button or close based on position/velocity
      if (showDelete || (deltaX < -SWIPE_THRESHOLD && velocity > 0.3)) {
        setSwipeX(-DELETE_BUTTON_WIDTH);
        setShowDelete(true);
      } else {
        setSwipeX(0);
        setShowDelete(false);
      }
      
      swipeStartRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [swipeX, showDelete]);

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onDelete(conversation.id);
      // Reset swipe state after deletion
      setSwipeX(0);
      setShowDelete(false);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset swipe when clicking elsewhere
  const handleClick = () => {
    if (showDelete) {
      setSwipeX(0);
      setShowDelete(false);
    } else {
      onClick();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden"
    >
      <AnimatePresence>
        {showDelete && (
          <motion.div
            className="absolute right-0 top-0 h-full bg-red-500 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ width: DELETE_BUTTON_WIDTH }}
          >
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-full w-full flex items-center justify-center text-white"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        animate={{ x: swipeX }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={handleClick}
        className={`relative bg-background p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
          isSelected ? 'bg-muted/50' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {conversation.other_user ? (
              <ClickableAvatar
                userId={conversation.other_user.id}
                username={conversation.other_user.username}
                avatarUrl={conversation.other_user.avatar_url}
                size="md"
              />
            ) : (
              <Avatar className="h-10 w-10">
                <AvatarImage src={undefined} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
            )}
            {conversation.other_user && isUserOnline(conversation.other_user.id) && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background z-10" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {conversation.other_user?.username || 'Unknown User'}
              </p>
              {conversation.last_message_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(conversation.last_message_at), 'MMM d')}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground truncate">
                {conversation.last_message || 'No messages yet'}
              </p>
              {conversation.unread_count > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {conversation.unread_count}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};