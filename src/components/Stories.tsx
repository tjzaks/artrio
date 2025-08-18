import { useState, useEffect } from 'react';
import { Plus, X, Heart, Send, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import SimpleStoryCreator from './SimpleStoryCreator';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption?: string;
  created_at: string;
  expires_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
  has_viewed?: boolean;
}

interface StoriesProps {
  trioMemberIds?: string[];
}

export default function Stories({ trioMemberIds = [] }: StoriesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [friendStories, setFriendStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [reactionMessage, setReactionMessage] = useState('');
  const [sendingReaction, setSendingReaction] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStories();
    }
  }, [user, trioMemberIds]);

  const fetchStories = async () => {
    try {
      // Fetch my stories
      const { data: myStoriesData } = await supabase
        .from('stories')
        .select(`
          *,
          profiles!inner(username, avatar_url),
          story_views!left(viewer_id)
        `)
        .eq('user_id', user?.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (myStoriesData) {
        setMyStories(myStoriesData);
      }

      // Fetch trio member stories
      if (trioMemberIds.length > 0) {
        const { data: trioStories } = await supabase
          .from('stories')
          .select(`
            *,
            profiles!inner(username, avatar_url),
            story_views!left(viewer_id)
          `)
          .in('user_id', trioMemberIds.filter(id => id !== user?.id))
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (trioStories) {
          const storiesWithViewStatus = trioStories.map(story => ({
            ...story,
            has_viewed: story.story_views?.some(v => v.viewer_id === user?.id)
          }));
          setStories(storiesWithViewStatus);
        }
      }

      // Fetch friend stories
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`);

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => 
          f.user_id === user?.id ? f.friend_id : f.user_id
        );

        const { data: friendStoriesData } = await supabase
          .from('stories')
          .select(`
            *,
            profiles!inner(username, avatar_url),
            story_views!left(viewer_id)
          `)
          .in('user_id', friendIds)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (friendStoriesData) {
          const storiesWithViewStatus = friendStoriesData.map(story => ({
            ...story,
            has_viewed: story.story_views?.some(v => v.viewer_id === user?.id)
          }));
          setFriendStories(storiesWithViewStatus);
        }
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewStory = async (story: Story) => {
    setSelectedStory(story);
    setReactionMessage('');
    
    // Mark as viewed if not already
    if (!story.has_viewed && story.user_id !== user?.id) {
      await supabase
        .from('story_views')
        .insert({ story_id: story.id, viewer_id: user?.id });
      
      // Update local state
      if (trioMemberIds.includes(story.user_id)) {
        setStories(prev => prev.map(s => 
          s.id === story.id ? { ...s, has_viewed: true } : s
        ));
      } else {
        setFriendStories(prev => prev.map(s => 
          s.id === story.id ? { ...s, has_viewed: true } : s
        ));
      }
    }
  };

  const sendReaction = async (emoji?: string) => {
    if (!selectedStory || (!reactionMessage.trim() && !emoji)) return;
    
    setSendingReaction(true);
    try {
      const { error } = await supabase
        .from('story_reactions')
        .upsert({
          story_id: selectedStory.id,
          user_id: user?.id,
          reaction: emoji || '💬',
          message: reactionMessage.trim() || null
        });

      if (error) throw error;

      toast({
        title: 'Reaction sent!',
        description: emoji ? 'Reacted with ' + emoji : 'Message sent'
      });

      setReactionMessage('');
    } catch (error) {
      console.error('Error sending reaction:', error);
      toast({
        title: 'Failed to send reaction',
        variant: 'destructive'
      });
    } finally {
      setSendingReaction(false);
    }
  };

  const groupStoriesByUser = (storyList: Story[]) => {
    const grouped = storyList.reduce((acc, story) => {
      if (!acc[story.user_id]) {
        acc[story.user_id] = {
          user_id: story.user_id,
          username: story.profiles.username,
          avatar_url: story.profiles.avatar_url,
          stories: [],
          has_unviewed: false
        };
      }
      acc[story.user_id].stories.push(story);
      if (!story.has_viewed) {
        acc[story.user_id].has_unviewed = true;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grouped);
  };

  const trioUserStories = groupStoriesByUser(stories);
  const friendUserStories = groupStoriesByUser(friendStories);

  return (
    <>
      <div className="flex gap-2 p-4 overflow-x-auto border-b bg-background/50">
        {/* Add Story button */}
        <div 
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
          onClick={() => setShowUpload(true)}
        >
          <div className="relative">
            {myStories.length > 0 ? (
              <Avatar 
                className="h-16 w-16 ring-2 ring-offset-2 ring-primary cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  viewStory(myStories[0]);
                }}
              >
                <AvatarImage src={myStories[0].profiles.avatar_url} />
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-16 w-16 border-2 border-dashed border-primary">
                <AvatarFallback>
                  <Plus className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            )}
            {myStories.length === 0 && (
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                <Plus className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <span className="text-xs">Your Story</span>
        </div>

      {/* Trio member stories (prioritized) */}
      {trioUserStories.map(userStory => (
        <div
          key={userStory.user_id}
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
          onClick={() => viewStory(userStory.stories[0])}
        >
          <div className="relative">
            <Avatar className={cn(
              "h-16 w-16 ring-2 ring-offset-2",
              userStory.has_unviewed ? "ring-primary" : "ring-muted"
            )}>
              <AvatarImage src={userStory.avatar_url} />
              <AvatarFallback>
                {userStory.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {trioMemberIds.includes(userStory.user_id) && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                T
              </div>
            )}
          </div>
          <span className="text-xs truncate w-16 text-center">
            {userStory.username}
          </span>
        </div>
      ))}

      {/* Friend stories */}
      {friendUserStories.map(userStory => (
        <div
          key={userStory.user_id}
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
          onClick={() => viewStory(userStory.stories[0])}
        >
          <div className="relative">
            <Avatar className={cn(
              "h-16 w-16 ring-2 ring-offset-2",
              userStory.has_unviewed ? "ring-blue-500" : "ring-muted"
            )}>
              <AvatarImage src={userStory.avatar_url} />
              <AvatarFallback>
                {userStory.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-xs truncate w-16 text-center">
            {userStory.username}
          </span>
        </div>
      ))}

      {/* Story Viewer Modal */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setSelectedStory(null)}
            className="absolute top-4 right-4 text-white z-10"
          >
            <X className="h-8 w-8" />
          </button>
          
          <div className="relative max-w-md w-full h-full flex flex-col">
            {/* Story header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedStory.profiles.avatar_url} />
                  <AvatarFallback>
                    {selectedStory.profiles.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white font-medium">
                  {selectedStory.profiles.username}
                </span>
                <span className="text-white/70 text-sm">
                  {new Date(selectedStory.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Story content */}
            <div className="flex-1 flex items-center justify-center px-4">
              {selectedStory.media_type === 'image' ? (
                <img
                  src={selectedStory.media_url}
                  alt="Story"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <video
                  src={selectedStory.media_url}
                  autoPlay
                  loop
                  muted
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
            </div>

            {/* Story caption */}
            {selectedStory.caption && (
              <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <p className="text-white">{selectedStory.caption}</p>
              </div>
            )}

            {/* Reaction bar (only for other people's stories) */}
            {selectedStory.user_id !== user?.id && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/80">
                <div className="flex gap-2">
                  {/* Quick reactions */}
                  <div className="flex gap-1">
                    {['❤️', '😂', '😮', '🔥'].map(emoji => (
                      <Button
                        key={emoji}
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => sendReaction(emoji)}
                        disabled={sendingReaction}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Message input */}
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Send a message..."
                      value={reactionMessage}
                      onChange={(e) => setReactionMessage(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      onKeyDown={(e) => e.key === 'Enter' && sendReaction()}
                    />
                    <Button
                      size="sm"
                      onClick={() => sendReaction()}
                      disabled={sendingReaction || !reactionMessage.trim()}
                      className="bg-white/20 hover:bg-white/30"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Story Creator */}
      <SimpleStoryCreator 
        open={showUpload} 
        onClose={() => setShowUpload(false)}
        onSuccess={fetchStories}
      />
    </>
  );
}