// INSTAGRAM-STYLE STORY VIEWER - SIMPLE!
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoryViewerProps {
  story: {
    media_url: string;
    profiles: {
      username: string;
      avatar_url?: string;
    };
    created_at: string;
  };
  onClose: () => void;
}

export default function InstagramStoryViewer({ story, onClose }: StoryViewerProps) {
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={story.profiles.avatar_url || '/placeholder.png'} 
              alt={story.profiles.username}
              className="h-8 w-8 rounded-full"
            />
            <span className="text-white font-medium">{story.profiles.username}</span>
            <span className="text-white/70 text-sm">{timeAgo(story.created_at)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Story image */}
      <img 
        src={story.media_url} 
        alt="Story"
        className="w-full h-full object-contain"
        onClick={onClose}
      />
    </div>
  );
}