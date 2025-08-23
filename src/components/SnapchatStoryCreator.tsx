import { useState, useRef, useEffect } from 'react';
import { 
  X, Camera as CameraIcon, Image as ImageIcon, Send, Type
} from 'lucide-react';
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

export default function SnapchatStoryCreator({ open, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [captionPosition, setCaptionPosition] = useState(50); // Percentage from top
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    setSelectedImage(null);
    setCaption('');
    setShowCaptionInput(false);
    setCaptionPosition(50);
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
    }
  };

  const compressImage = async (dataUrl: string): Promise<Blob> => {
    // This shrinks images from 5MB to ~200KB
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 1080;  // Instagram story size
    const MAX_HEIGHT = 1920;
    
    // Calculate new dimensions
    let width = img.width;
    let height = img.height;
    
    if (width > height) {
      if (width > MAX_WIDTH) {
        height = height * (MAX_WIDTH / width);
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width = width * (MAX_HEIGHT / height);
        height = MAX_HEIGHT;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw and compress
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    
    // 0.85 quality = good enough, much smaller
    return new Promise(resolve => 
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85)
    );
  };

  const handlePost = async () => {
    if (!selectedImage || uploading) return;
    
    console.log('[STORY] Starting post process...');
    console.log('[STORY] User ID:', user?.id);
    
    setUploading(true);
    
    try {
      // Convert data URL to compressed blob
      console.log('[STORY] Compressing image...');
      const blob = await compressImage(selectedImage);
      console.log('[STORY] Image compressed, size:', blob.size);
      
      // Create a unique filename
      const fileName = `${user?.id}/${Date.now()}.jpg`;
      
      // Upload the image
      console.log('[STORY] Uploading to storage bucket...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('[STORY] Storage upload failed:', uploadError);
        throw uploadError;
      }
      console.log('[STORY] Upload successful, data:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);
      
      console.log('[STORY] Public URL:', publicUrl);

      // Get today's trio if user is in one (optional for stories)
      let trioId = null;
      try {
        const { data: todaysTrio } = await supabase
          .from('trios')
          .select('id')
          .eq('date', new Date().toISOString().split('T')[0])
          .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id},user3_id.eq.${user?.id}`)
          .maybeSingle();
        
        if (todaysTrio?.id) {
          trioId = todaysTrio.id;
        }
      } catch (error) {
        // Trio is optional for stories, continue without it
      }

      // Create story post (trio_id is optional for stories)
      const { data: insertedPost, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,
          trio_id: trioId, // Can be null for stories
          content: caption || '📸',
          image_url: publicUrl,
          media_url: publicUrl,
          media_type: 'image',
          post_type: 'story',
          metadata: {
            caption_position: captionPosition
          }
        })
        .select()
        .single();

      if (postError) {
        console.error('[STORY] Failed to post story:', postError);
        console.error('[STORY] Post data was:', {
          user_id: user?.id,
          trio_id: trioId,
          post_type: 'story',
          media_url: publicUrl
        });
        throw postError;
      }
      
      console.log('[STORY] Story posted successfully!');

      toast({
        title: 'Story posted!',
        description: 'Your story has been shared'
      });

      handleClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('[STORY] Error details:', error);
      
      // Show detailed error for debugging
      const errorMessage = error.message || 'Unknown error';
      const errorDetails = error.details || '';
      const errorHint = error.hint || '';
      
      toast({
        title: 'Story Error',
        description: `${errorMessage}${errorDetails ? '\n' + errorDetails : ''}${errorHint ? '\n' + errorHint : ''}`,
        variant: 'destructive'
      });
      
      // Also alert for debugging
      alert(`Story posting failed:\n${errorMessage}\n${JSON.stringify(error, null, 2)}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle touch/mouse events for dragging
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientY: number;
    if ('touches' in e) {
      clientY = e.touches[0].clientY;
    } else {
      clientY = e.clientY;
    }
    
    const relativeY = clientY - rect.top;
    const percentage = (relativeY / rect.height) * 100;
    
    // Clamp between 10% and 90% to keep text visible
    setCaptionPosition(Math.min(90, Math.max(10, percentage)));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-screen p-0">
        <div className="h-full flex flex-col bg-black">
          {!selectedImage ? (
            // Photo selection screen
            <div className="h-full flex flex-col bg-background">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-xl font-semibold">Create Story</h2>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                <Button
                  size="lg"
                  className="w-full max-w-xs h-32 flex flex-col gap-3"
                  variant="outline"
                  onClick={takePhoto}
                >
                  <CameraIcon className="h-8 w-8" />
                  <span>Take Photo</span>
                </Button>
                
                <Button
                  size="lg"
                  className="w-full max-w-xs h-32 flex flex-col gap-3"
                  variant="outline"
                  onClick={choosePhoto}
                >
                  <ImageIcon className="h-8 w-8" />
                  <span>Choose from Gallery</span>
                </Button>
              </div>
            </div>
          ) : (
            // Editing screen
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCaptionInput(!showCaptionInput)}
                    className="text-white hover:bg-white/20"
                  >
                    <Type className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Canvas area */}
              <div 
                ref={canvasRef}
                className="flex-1 relative overflow-hidden"
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <img 
                  src={selectedImage} 
                  alt="Story" 
                  className="w-full h-full object-contain"
                />
                
                {/* Caption overlay */}
                {caption && (
                  <div 
                    className="absolute left-0 right-0 flex justify-center px-4"
                    style={{ top: `${captionPosition}%`, transform: 'translateY(-50%)' }}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                  >
                    <div className="bg-black/70 text-white px-4 py-2 rounded-full max-w-[90%] cursor-move">
                      <p className="text-center text-lg font-medium">{caption}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption input */}
              {showCaptionInput && (
                <div className="absolute bottom-20 left-0 right-0 p-4">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full bg-black/70 text-white px-4 py-3 rounded-full placeholder-white/60 outline-none"
                    autoFocus
                  />
                </div>
              )}

              {/* Bottom actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <Button
                  size="lg"
                  onClick={handlePost}
                  disabled={uploading}
                  className="w-full bg-white text-black hover:bg-gray-100"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                      Posting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Share Story
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}