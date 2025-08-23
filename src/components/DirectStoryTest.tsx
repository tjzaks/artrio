import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function DirectStoryTest() {
  const { user } = useAuth();
  const [status, setStatus] = useState('Ready');
  
  const testDirectPost = async () => {
    if (!user?.id) {
      setStatus('Not logged in');
      return;
    }
    
    setStatus('Testing...');
    
    try {
      // Skip EVERYTHING - just try to insert a post with a fake URL
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: 'Direct test story',
          post_type: 'story',
          media_url: 'https://via.placeholder.com/150',
          media_type: 'image',
          trio_id: null
        })
        .select()
        .single();
      
      if (error) {
        setStatus(`DB Error: ${error.message}`);
        console.error('Full error:', error);
      } else {
        setStatus('✅ SUCCESS! Post created');
        console.log('Created:', data);
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };
  
  return (
    <div className="fixed top-20 right-4 z-50 bg-yellow-400 p-4 rounded">
      <Button onClick={testDirectPost} variant="destructive">
        Test Direct Post
      </Button>
      <p className="text-xs mt-2 font-bold">{status}</p>
    </div>
  );
}