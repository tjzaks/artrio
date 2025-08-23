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
    
    console.log('[STORY] Starting upload process...');
    setUploading(true);
    
    try {
      // Convert data URL to compressed blob
      console.log('[STORY] Compressing image...');
      const blob = await compressImage(selectedImage);
      console.log('[STORY] Image compressed, size:', blob.size);
      
      // Create a unique filename
      const fileName = `${user?.id}/${Date.now()}.jpg`;
      console.log('[STORY] Filename:', fileName);
      
      // First, check if the bucket exists and create it if needed
      const { data: buckets } = await supabase.storage.listBuckets();
      const storiesBucket = buckets?.find(b => b.name === 'stories');
      
      if (!storiesBucket) {
        console.log('[STORY] Creating stories bucket...');
        // Create the bucket with public access
        const { error: createError } = await supabase.storage.createBucket('stories', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        });
        
        if (createError && !createError.message.includes('already exists')) {
          throw createError;
        }
      }
      
      // Upload the image
      console.log('[STORY] Uploading to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('[STORY] Upload error:', uploadError);
        throw uploadError;
      }
      console.log('[STORY] Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);
      console.log('[STORY] Public URL:', publicUrl);

      // Get today's trio to associate story with it (optional now)
      console.log('[STORY] Checking for trio...');
      const { data: todaysTrio } = await supabase
        .from('trios')
        .select('id')
        .eq('date', new Date().toISOString().split('T')[0])
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id},user3_id.eq.${user?.id}`)
        .maybeSingle(); // Use maybeSingle instead of single to allow null

      console.log('[STORY] Trio found:', todaysTrio?.id || 'none');

      // Create story post in database with caption position
      console.log('[STORY] Creating post in database...');
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,  // Use auth user.id for posts table
          trio_id: todaysTrio?.id || null,  // Make trio_id optional
          content: caption || '📸',
          image_url: publicUrl,
          media_url: publicUrl,  // Also set media_url for compatibility
          media_type: 'image',
          post_type: 'story',
          metadata: {
            caption_position: captionPosition
          }
        })
        .select()
        .single();

      if (postError) {
        console.error('[STORY] Post error:', postError);
        throw postError;
      }
      console.log('[STORY] Post created successfully:', postData);

      toast({
        title: 'Story posted!',
        description: 'Your story has been shared'
      });

      handleClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('[STORY] Error posting story:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to post story',
        variant: 'destructive'
      });
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
              <div className="flex items-center justify-between pt-safe px-4 pb-4 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                >
                  <X className="h-5 w-5" />
                </Button>
                <h2 className="font-semibold">Create Story</h2>
                <div className="w-10" />
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
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
            </div>
          ) : (
            // Snapchat-style editor
            <div 
              ref={canvasRef}
              className="relative h-full w-full overflow-hidden"
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              {/* Background Image */}
              <img 
                src={selectedImage}
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Top Controls */}
              <div className="absolute top-0 left-0 right-0 pt-safe px-4 pb-4 flex items-center justify-between z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedImage(null)}
                  className="bg-black/30 hover:bg-black/50 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCaptionInput(!showCaptionInput)}
                    className="bg-black/30 hover:bg-black/50 text-white"
                  >
                    <Type className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              {/* Draggable Caption */}
              {caption && (
                <div
                  className="absolute left-0 right-0 flex justify-center px-4 cursor-move select-none"
                  style={{ 
                    top: `${captionPosition}%`,
                    transform: 'translateY(-50%)'
                  }}
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                >
                  <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full max-w-[90%]">
                    <p className="text-white text-center font-medium">
                      {caption}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Caption Input (Snapchat-style) */}
              {showCaptionInput && (
                <div className="absolute bottom-20 left-0 right-0 px-4 z-30">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add caption..."
                    className="w-full bg-black/50 backdrop-blur-sm text-white placeholder-gray-400 px-4 py-3 rounded-full border border-white/20 focus:outline-none focus:border-white/40"
                    maxLength={100}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowCaptionInput(false);
                      }
                    }}
                  />
                </div>
              )}
              
              {/* Bottom Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between z-20">
                <div className="flex-1" />
                
                <Button
                  onClick={handlePost}
                  disabled={uploading}
                  className="bg-white text-black hover:bg-gray-200 rounded-full px-6"
                >
                  {uploading ? 'Posting...' : 'Share'}
                  {!uploading && <Send className="h-4 w-4 ml-2" />}
                </Button>
              </div>
              
              {/* Drag Instruction */}
              {caption && !isDragging && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <p className="text-white/50 text-xs animate-pulse">
                    Drag text to reposition
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}