// Test stories with external images (no upload needed)
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function ExternalImageStory() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  
  const postWithExternalImage = async () => {
    if (!user?.id) {
      setStatus('Not logged in');
      return;
    }
    
    setStatus('Posting...');
    
    try {
      // Use an external image URL (no upload needed!)
      const externalImageUrl = 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=400';
      
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: '🎉 External image story!',
          post_type: 'story',
          media_url: externalImageUrl,
          media_type: 'image',
          trio_id: null
        })
        .select()
        .single();
      
      if (error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus('✅ Story posted with external image!');
        console.log('Posted:', data);
        
        // Don't refresh - it's breaking the app
        // setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={postWithExternalImage}
        className="bg-purple-500 hover:bg-purple-600"
      >
        Post External Image Story
      </Button>
      {status && (
        <p className="text-xs mt-2 bg-white p-2 rounded">{status}</p>
      )}
    </div>
  );
}