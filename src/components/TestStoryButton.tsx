import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function TestStoryButton() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  
  const testStory = async () => {
    setStatus('Starting test...');
    
    try {
      // Step 1: Check auth
      if (!user?.id) {
        setStatus('Error: Not authenticated');
        return;
      }
      setStatus(`User: ${user.id}`);
      
      // Step 2: Test database connection
      const { data: testQuery, error: queryError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (queryError) {
        setStatus(`DB Error: ${queryError.message}`);
        return;
      }
      setStatus('DB connection OK');
      
      // Step 3: Test storage bucket exists
      const { data: buckets, error: bucketError } = await supabase.storage
        .listBuckets();
        
      if (bucketError) {
        setStatus(`Storage Error: ${bucketError.message}`);
        return;
      }
      
      const hasStoriesBucket = buckets?.some(b => b.name === 'stories');
      if (!hasStoriesBucket) {
        setStatus('Error: Stories bucket not found');
        return;
      }
      setStatus('Storage bucket OK');
      
      // Step 4: Create a tiny test image (1x1 red pixel)
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 1, 1);
      
      const blob = await new Promise<Blob>(resolve => 
        canvas.toBlob(blob => resolve(blob!), 'image/png')
      );
      setStatus('Test image created');
      
      // Step 5: Try to upload
      const fileName = `${user.id}/test_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob);
        
      if (uploadError) {
        setStatus(`Upload Error: ${uploadError.message}`);
        return;
      }
      setStatus('Upload OK');
      
      // Step 6: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);
      setStatus(`URL: ${publicUrl.substring(0, 50)}...`);
      
      // Step 7: Try to insert post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          trio_id: null,
          content: 'Test story',
          post_type: 'story',
          media_url: publicUrl,
          media_type: 'image',
          image_url: publicUrl
        })
        .select()
        .single();
        
      if (postError) {
        setStatus(`Post Error: ${postError.message}`);
        console.error('Full error:', postError);
        return;
      }
      
      setStatus('✅ SUCCESS! Story posted');
      console.log('Created post:', post);
      
    } catch (error: any) {
      setStatus(`Unexpected: ${error.message}`);
      console.error('Full error:', error);
    }
  };
  
  return (
    <div className="fixed bottom-20 left-4 z-50 bg-white p-4 rounded shadow-lg max-w-xs">
      <Button onClick={testStory} className="mb-2">
        Test Story System
      </Button>
      <p className="text-xs break-all">{status}</p>
    </div>
  );
}