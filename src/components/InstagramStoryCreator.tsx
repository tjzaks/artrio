// INSTAGRAM-STYLE STORY CREATOR - SIMPLE AND WORKING!
import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface StoryCreatorProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InstagramStoryCreator({ open, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageData, setImageData] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setImageData('');
    setUploading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Instagram-style: Pick photo from gallery
  const pickPhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      
      if (photo.dataUrl) {
        setImageData(photo.dataUrl);
      }
    } catch (error) {
      console.error('Photo picker error:', error);
    }
  };

  // Instagram-style: Take photo with camera
  const takePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (photo.dataUrl) {
        setImageData(photo.dataUrl);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  // SIMPLE INSTAGRAM-STYLE POST
  const postStory = async () => {
    if (!imageData || uploading || !user?.id) return;
    
    setUploading(true);
    
    try {
      // Convert base64 to blob - SIMPLE!
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Upload to storage - SIMPLE!
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob);
      
      if (uploadError) throw uploadError;
      
      // Get URL - SIMPLE!
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);
      
      // Save to database - SIMPLE!
      const { error: dbError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: '📸',
          media_url: publicUrl,
          media_type: 'image',
          post_type: 'story',
          trio_id: null
        });
      
      if (dbError) throw dbError;
      
      // SUCCESS!
      toast({
        title: '✅ Story posted!',
        description: 'Your story is now live'
      });
      
      handleClose();
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error('Story error:', error);
      toast({
        title: 'Failed to post story',
        description: error.message,
        variant: 'destructive'
      });
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-screen p-0 bg-black">
        {!imageData ? (
          // Photo selection - Instagram style
          <div className="h-full flex flex-col justify-center items-center gap-4 p-8">
            <h2 className="text-white text-2xl font-bold mb-8">Create Story</h2>
            
            <Button 
              size="lg" 
              variant="secondary"
              className="w-full max-w-xs"
              onClick={pickPhoto}
            >
              Choose from Gallery
            </Button>
            
            <Button 
              size="lg"
              variant="secondary" 
              className="w-full max-w-xs"
              onClick={takePhoto}
            >
              Take Photo
            </Button>
            
            <Button 
              variant="ghost" 
              className="text-white mt-8"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        ) : (
          // Preview and share - Instagram style
          <div className="h-full relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setImageData('')}
              className="absolute top-4 left-4 z-20 text-white"
            >
              <X className="h-6 w-6" />
            </Button>
            
            {/* Image preview */}
            <img 
              src={imageData} 
              alt="Story preview" 
              className="w-full h-full object-contain"
            />
            
            {/* Share button - Instagram style */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <Button
                size="lg"
                onClick={postStory}
                disabled={uploading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                {uploading ? (
                  <span>Sharing...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="h-5 w-5" />
                    Share to Story
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}