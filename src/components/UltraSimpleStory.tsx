import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function UltraSimpleStory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  
  const createStory = async () => {
    if (!user?.id) {
      alert('Not logged in!');
      return;
    }
    
    setUploading(true);
    
    try {
      // Create a tiny red square image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      
      // Upload to storage
      const fileName = `${user.id}/test_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob);
      
      if (uploadError) {
        alert(`Upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }
      
      // Get URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);
      
      // Save to database
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: 'Test story',
          post_type: 'story',
          media_url: publicUrl,
          media_type: 'image',
          image_url: publicUrl,
          trio_id: null
        })
        .select()
        .single();
      
      if (postError) {
        alert(`Post failed: ${postError.message}`);
      } else {
        alert('SUCCESS! Story posted!');
        console.log('Posted:', post);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <Button 
      onClick={createStory} 
      disabled={uploading}
      className="fixed bottom-4 left-4 z-50 bg-green-500"
    >
      {uploading ? 'Creating...' : 'Create Test Story'}
    </Button>
  );
}