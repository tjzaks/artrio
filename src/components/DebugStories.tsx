import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugStories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const checkStories = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get ALL stories from the last 24 hours
      const { data: allStories, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          media_url,
          post_type,
          created_at,
          profiles!posts_user_id_fkey (
            id,
            username
          )
        `)
        .eq('post_type', 'story')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching stories:', error);
      } else {
        setStories(allStories || []);
        console.log('Found stories:', allStories);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    checkStories();
  }, [user]);
  
  return (
    <div className="fixed top-20 left-4 z-50 bg-white p-4 rounded shadow-lg max-w-sm">
      <h3 className="font-bold mb-2">Story Debug</h3>
      <Button onClick={checkStories} size="sm" className="mb-2">
        Refresh Stories
      </Button>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
          <p className="font-semibold">Total stories: {stories.length}</p>
          {stories.map((story, i) => (
            <div key={story.id} className="border-b pb-1">
              <p>{i + 1}. {story.profiles?.username || 'Unknown'}</p>
              <p className="text-gray-500">
                {story.user_id === user?.id ? '(Your story)' : ''}
              </p>
              <p className="text-gray-400 truncate">
                URL: {story.media_url?.substring(0, 50)}...
              </p>
            </div>
          ))}
          {stories.length === 0 && <p>No stories found</p>}
        </div>
      )}
    </div>
  );
}