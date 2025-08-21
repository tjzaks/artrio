import { useState, useRef, memo, useCallback } from 'react';
import { MessageCircle, Trash2, MoreVertical, Edit, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  user_id: string;
  profiles: Profile;
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  profiles: Profile;
}

interface SwipeablePostCardProps {
  post: Post;
  replies: Reply[];
  currentUserId: string | undefined;
  userHasReplied: boolean;
  onReplySubmit: (postId: string, content: string) => Promise<void>;
  onPostDeleted?: () => void;
}

const SwipeableReply = memo(function SwipeableReply({ 
  reply, 
  currentUserId,
  onDeleted 
}: { 
  reply: Reply; 
  currentUserId: string | undefined;
  onDeleted: () => void;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [showDelete, setShowDelete] = useState(false);
  const touchStartX = useRef(0);
  const { toast } = useToast();
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (reply.user_id !== currentUserId) return;
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (reply.user_id !== currentUserId) return;
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    
    if (diff > 0 && diff <= 100) {
      setTranslateX(-diff);
      setShowDelete(diff > 50);
    }
  };
  
  const handleTouchEnd = () => {
    if (showDelete) {
      setTranslateX(-100);
    } else {
      setTranslateX(0);
      setShowDelete(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('replies')
        .delete()
        .eq('id', reply.id)
        .eq('user_id', currentUserId);
        
      if (error) throw error;
      
      toast({
        title: 'Comment deleted',
        description: 'Your comment has been removed'
      });
      
      onDeleted();
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="relative overflow-hidden">
      <div 
        className="flex items-start gap-2 transition-transform duration-200"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={reply.profiles.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {reply.profiles.username.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-xs truncate">@{reply.profiles.username}</p>
            <p className="text-xs text-muted-foreground flex-shrink-0">
              {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <p className="text-sm break-words">{reply.content}</p>
        </div>
      </div>
      
      {reply.user_id === currentUserId && (
        <button
          onClick={handleDelete}
          className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center transition-opacity ${
            showDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

const SwipeablePostCard = memo(function SwipeablePostCard({ 
  post, 
  replies, 
  currentUserId,
  userHasReplied,
  onReplySubmit,
  onPostDeleted
}: SwipeablePostCardProps) {
  const [showReplyField, setShowReplyField] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [localReplies, setLocalReplies] = useState(replies);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleToggleReply = useCallback(() => {
    setShowReplyField(prev => !prev);
    setIsEditing(false); // Close edit if opening reply
  }, []);

  const handleReplySubmit = useCallback(async () => {
    if (!replyContent.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onReplySubmit(post.id, replyContent.trim());
      setReplyContent('');
      setShowReplyField(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [replyContent, isSubmitting, onReplySubmit, post.id]);
  
  const handleEdit = () => {
    setIsEditing(true);
    setShowReplyField(false); // Close reply if opening edit
  };
  
  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', post.id)
        .eq('user_id', currentUserId);
        
      if (error) throw error;
      
      toast({
        title: 'Post updated',
        description: 'Your post has been edited'
      });
      
      setIsEditing(false);
      // Update local post content
      post.content = editContent.trim();
    } catch (error) {
      console.error('Error editing post:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit post',
        variant: 'destructive'
      });
    }
  };
  
  const handleDeletePost = async () => {
    try {
      // Delete all replies first
      if (localReplies.length > 0) {
        const { error: repliesError } = await supabase
          .from('replies')
          .delete()
          .eq('post_id', post.id);
          
        if (repliesError) throw repliesError;
      }
      
      // Delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', currentUserId);
        
      if (error) throw error;
      
      toast({
        title: 'Post deleted',
        description: 'Your post has been removed'
      });
      
      if (onPostDeleted) onPostDeleted();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive'
      });
    }
  };
  
  const handleReplyDeleted = (replyId: string) => {
    setLocalReplies(prev => prev.filter(r => r.id !== replyId));
  };

  return (
    <Card className="content-card animate-slide-up overflow-hidden relative">
      <CardContent className="p-4 space-y-3">
        <div className="relative flex items-start gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={post.profiles.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {post.profiles.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-medium text-sm truncate">@{post.profiles.username}</p>
              <p className="text-xs text-muted-foreground flex-shrink-0">
                {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            {/* Show edit field or content */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} className="h-8">
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(post.content || '');
                    }}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              post.content && <p className="text-sm leading-relaxed break-words">{post.content}</p>
            )}
            
            {/* Media Display */}
            {post.media_url && (
              <div className="mt-3">
                {post.media_type === 'image' ? (
                  <img 
                    src={post.media_url} 
                    alt="Post media" 
                    className="max-w-full h-auto rounded-lg border"
                    style={{ maxHeight: '300px' }}
                  />
                ) : post.media_type === 'video' ? (
                  <video 
                    src={post.media_url} 
                    controls 
                    className="max-w-full h-auto rounded-lg border"
                    style={{ maxHeight: '300px' }}
                  />
                ) : null}
              </div>
            )}
          </div>
          
          {/* Dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                type="button"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {post.user_id === currentUserId && (
                <>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDeletePost}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleToggleReply} disabled={userHasReplied}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {userHasReplied ? 'Commented' : 'Comment'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Replies */}
        {localReplies.length > 0 && (
          <div className="ml-11 space-y-2 border-l-2 border-muted pl-3">
            {localReplies.slice(0, 3).map((reply) => (
              <SwipeableReply
                key={reply.id}
                reply={reply}
                currentUserId={currentUserId}
                onDeleted={() => handleReplyDeleted(reply.id)}
              />
            ))}
            {localReplies.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{localReplies.length - 3} more replies
              </p>
            )}
          </div>
        )}

        {/* Reply input field */}
        {showReplyField && !userHasReplied && (
          <div className="ml-11 space-y-2 animate-in slide-in-from-top-2">
            <Textarea
              placeholder="Add a comment..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              disabled={isSubmitting}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleReplySubmit}
                disabled={!replyContent.trim() || isSubmitting}
                className="h-8"
              >
                {isSubmitting ? 'Posting...' : 'Comment'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowReplyField(false);
                  setReplyContent('');
                }}
                disabled={isSubmitting}
                className="h-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {userHasReplied && (
          <p className="ml-11 text-xs text-muted-foreground">
            ✓ Commented
          </p>
        )}
      </CardContent>
    </Card>
  );
});

export default SwipeablePostCard;