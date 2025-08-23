// INSTAGRAM-STYLE STORIES - SIMPLE AND WORKING!
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import InstagramStoryCreator from './InstagramStoryCreator';
import InstagramStoryViewer from './InstagramStoryViewer';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export default function InstagramStories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [myStory, setMyStory] = useState<Story | null>(null);

  useEffect(() => {
    if (user) {
      fetchStories();
    }
  }, [user]);

  const fetchStories = async () => {
    if (!user) return;

    try {
      // Get my friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Get stories from friends (Instagram style - friends see your stories)
      const { data: friendStories } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          media_url,
          created_at,
          profiles!posts_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('post_type', 'story')
        .in('user_id', friendIds)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      // Get my story (use maybeSingle to avoid error if no story)
      const { data: myStoryData } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          media_url,
          created_at,
          profiles!posts_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('post_type', 'story')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStories(friendStories || []);
      setMyStory(myStoryData);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  // Group stories by user (Instagram style) - with safety check
  const groupedStories = stories.reduce((acc, story) => {
    if (!story.profiles) return acc; // Skip if no profile data
    const userId = story.profiles.id;
    if (!acc[userId]) {
      acc[userId] = {
        user: story.profiles,
        stories: []
      };
    }
    acc[userId].stories.push(story);
    return acc;
  }, {} as Record<string, { user: any; stories: Story[] }>);

  return (
    <div className="flex gap-2 p-4 overflow-x-auto">
      {/* Your story button */}
      <div className="flex flex-col items-center gap-1 min-w-fit">
        <button
          onClick={() => myStory ? setSelectedStory(myStory) : setShowCreator(true)}
          className="relative"
        >
          <Avatar className={`h-16 w-16 ${myStory ? 'ring-2 ring-pink-500 ring-offset-2' : ''}`}>
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>You</AvatarFallback>
          </Avatar>
          {!myStory && (
            <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1">
              <Plus className="h-4 w-4 text-white" />
            </div>
          )}
        </button>
        <span className="text-xs">Your story</span>
      </div>

      {/* Friends' stories */}
      {Object.values(groupedStories).map(({ user, stories }) => (
        <div key={user.id} className="flex flex-col items-center gap-1 min-w-fit">
          <button
            onClick={() => setSelectedStory(stories[0])}
            className="relative"
          >
            <Avatar className="h-16 w-16 ring-2 ring-gradient-to-r from-purple-500 to-pink-500 ring-offset-2">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
          <span className="text-xs truncate max-w-[64px]">{user.username}</span>
        </div>
      ))}

      {/* Story creator */}
      <InstagramStoryCreator
        open={showCreator}
        onClose={() => setShowCreator(false)}
        onSuccess={() => {
          fetchStories();
          setShowCreator(false);
        }}
      />

      {/* Story viewer */}
      {selectedStory && (
        <InstagramStoryViewer
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </div>
  );
}