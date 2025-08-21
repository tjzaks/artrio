import { useState, memo, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

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

interface PostCardProps {
  post: Post;
  replies: Reply[];
  currentUserId: string | undefined;
  userHasReplied: boolean;
  onReplySubmit: (postId: string, content: string) => Promise<void>;
}

const PostCard = memo(function PostCard({ 
  post, 
  replies, 
  currentUserId,
  userHasReplied,
  onReplySubmit 
}: PostCardProps) {
  const [showReplyField, setShowReplyField] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleReply = useCallback(() => {
    setShowReplyField(prev => !prev);
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

  return (
    <Card className="content-card animate-slide-up">
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
            {post.content && <p className="text-sm leading-relaxed break-words">{post.content}</p>}
            
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
          
          {/* Comments button - right side, middle aligned */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleReply}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title={`${replies.length} comment${replies.length !== 1 ? 's' : ''}`}
          >
            <MessageCircle className="h-4 w-4" />
            {replies.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {replies.length}
              </span>
            )}
          </Button>
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="ml-11 space-y-2 border-l-2 border-muted pl-3">
            {replies.slice(0, 3).map((reply) => (
              <div key={reply.id} className="flex items-start gap-2">
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
            ))}
            {replies.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{replies.length - 3} more replies
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
              autoFocus
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

export default PostCard;