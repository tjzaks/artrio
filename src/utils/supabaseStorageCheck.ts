import { supabase } from '@/integrations/supabase/client';

export const checkStoriesbucket = async () => {
  try {
    console.log('🪣 Checking if stories bucket exists...');
    
    // Try to list buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('🪣 Error listing buckets:', listError);
      return false;
    }
    
    console.log('🪣 Available buckets:', buckets);
    
    // Check if stories bucket exists
    const storiesBucket = buckets?.find(bucket => bucket.name === 'stories');
    
    if (storiesBucket) {
      console.log('🪣 Stories bucket exists:', storiesBucket);
      return true;
    } else {
      console.log('🪣 Stories bucket does not exist, attempting to create...');
      
      // Try to create the stories bucket
      const { data: createData, error: createError } = await supabase.storage.createBucket('stories', {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      });
      
      if (createError) {
        console.error('🪣 Error creating stories bucket:', createError);
        return false;
      }
      
      console.log('🪣 Stories bucket created successfully:', createData);
      return true;
    }
  } catch (error) {
    console.error('🪣 Unexpected error checking stories bucket:', error);
    return false;
  }
};

export const testUpload = async () => {
  try {
    console.log('🧪 Testing upload to stories bucket...');
    
    // Create a small test image blob
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
    }
    
    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('🧪 Failed to create test blob');
          resolve(false);
          return;
        }
        
        const testFileName = `test-${Date.now()}.jpg`;
        
        const { data, error } = await supabase.storage
          .from('stories')
          .upload(testFileName, blob);
        
        if (error) {
          console.error('🧪 Test upload failed:', error);
          resolve(false);
        } else {
          console.log('🧪 Test upload successful:', data);
          
          // Clean up test file
          await supabase.storage.from('stories').remove([testFileName]);
          console.log('🧪 Test file cleaned up');
          resolve(true);
        }
      }, 'image/jpeg', 0.9);
    });
  } catch (error) {
    console.error('🧪 Test upload error:', error);
    return false;
  }
};