import { useState } from 'react';
import { 
  X, Camera as CameraIcon, Image as ImageIcon, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface StoryCreatorProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NativeStoryCreator({ open, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleReset = () => {
    setSelectedImage(null);
    setCaption('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (image.dataUrl) {
        setSelectedImage(image.dataUrl);
      }
    } catch (error) {
      console.error('Camera error:', error);
      // User cancelled or error - just ignore
    }
  };

  const choosePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      
      if (image.dataUrl) {
        setSelectedImage(image.dataUrl);
      }
    } catch (error) {
      console.error('Photo picker error:', error);
      // User cancelled or error - just ignore
    }
  };

  const handlePost = async () => {
    if (!selectedImage || uploading) return;
    
    setUploading(true);
    
    try {
      // Convert data URL to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      // Upload to Supabase storage
      const fileName = `${user?.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Create story post in database
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,  // Use auth user.id for posts table
          content: caption || '📸',
          image_url: publicUrl,
          post_type: 'story'
        });

      if (postError) throw postError;

      toast({
        title: 'Story posted!',
        description: 'Your story has been shared'
      });

      handleClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error posting story:', error);
      toast({
        title: 'Error',
        description: 'Failed to post story',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <div className="h-full flex flex-col bg-background">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
            
            <h2 className="font-semibold">Create Story</h2>
            
            {selectedImage ? (
              <Button
                size="sm"
                onClick={handlePost}
                disabled={uploading}
              >
                {uploading ? 'Posting...' : 'Post'}
                {!uploading && <Send className="h-4 w-4 ml-2" />}
              </Button>
            ) : (
              <div className="w-10" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!selectedImage ? (
              // Photo selection screen
              <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-lg font-medium">Add to your story</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Share a moment with your trios
                </p>
                
                <div className="w-full max-w-xs space-y-3">
                  <Button
                    onClick={takePhoto}
                    className="w-full"
                    size="lg"
                  >
                    <CameraIcon className="h-5 w-5 mr-2" />
                    Take Photo
                  </Button>
                  
                  <Button
                    onClick={choosePhoto}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <ImageIcon className="h-5 w-5 mr-2" />
                    Choose from Library
                  </Button>
                </div>
              </div>
            ) : (
              // Preview and caption screen
              <div className="h-full flex flex-col">
                <div className="relative flex-1 bg-black">
                  <img 
                    src={selectedImage}
                    alt="Story preview"
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Remove photo button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Caption input */}
                <div className="p-4 border-t">
                  <Textarea
                    placeholder="Add a caption... (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="resize-none"
                    rows={3}
                    maxLength={280}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {caption.length}/280
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}