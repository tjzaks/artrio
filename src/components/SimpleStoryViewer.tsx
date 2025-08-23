import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function SimpleStoryViewer() {
  const { user } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  
  useEffect(() => {
    if (user) fetchStories();
  }, [user]);
  
  const fetchStories = async () => {
    if (!user?.id) return;
    
    try {
      // Get all stories from last 24 hours
      const { data } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('post_type', 'story')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      setStories(data || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };
  
  const currentStory = stories[currentIndex];
  
  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowViewer(false);
      setCurrentIndex(0);
    }
  };
  
  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  return (
    <>
      {/* Story bubbles */}
      <div className="flex gap-2 p-4 overflow-x-auto bg-gray-50">
        {stories.length === 0 ? (
          <p className="text-sm text-gray-500">No stories yet</p>
        ) : (
          stories.map((story, index) => (
            <button
              key={story.id}
              onClick={() => {
                setCurrentIndex(index);
                setShowViewer(true);
              }}
              className="flex flex-col items-center gap-1 min-w-fit"
            >
              {/* Instagram/Snapchat style gradient ring for new stories */}
              <div className="relative">
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <img 
                      src={story.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${story.profiles?.username}`}
                      alt={story.profiles?.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium">
                {story.user_id === user?.id ? 'Your story' : story.profiles?.username}
              </span>
            </button>
          ))
        )}
      </div>
      
      {/* Story viewer */}
      {showViewer && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
            {stories.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white transition-all ${
                    index <= currentIndex ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>
          
          {/* Header */}
          <div className="absolute top-8 left-0 right-0 flex items-center justify-between p-4 z-10">
            <div className="flex items-center gap-2">
              <img 
                src={currentStory.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${currentStory.profiles?.username}`}
                alt={currentStory.profiles?.username}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-white font-medium">
                {currentStory.profiles?.username}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowViewer(false)}
              className="text-white"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Story image */}
          <div className="flex-1 relative" onClick={nextStory}>
            <img 
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-contain"
            />
            
            {/* Tap areas */}
            <button 
              className="absolute left-0 top-0 w-1/3 h-full"
              onClick={(e) => {
                e.stopPropagation();
                prevStory();
              }}
            />
            <button 
              className="absolute right-0 top-0 w-2/3 h-full"
              onClick={nextStory}
            />
          </div>
          
          {/* Caption if exists */}
          {currentStory.content && currentStory.content !== '📸' && (
            <div className="absolute bottom-20 left-0 right-0 flex justify-center p-4">
              <div className="bg-black/70 text-white px-4 py-2 rounded-full">
                {currentStory.content}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}