import { useState, useRef, useEffect } from 'react';
import { 
  X, Type, Send, ChevronDown, Camera as CameraIcon, Grid3x3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface StoryCreatorProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface TextOverlay {
  id: string;
  text: string;
  style: 'normal' | 'bold' | 'outline';
  position: { x: number; y: number };
  color: string;
  fontSize: 'small' | 'medium' | 'large';
}

const TEXT_STYLES = {
  normal: '',
  bold: 'font-bold',
  outline: 'font-bold text-stroke'
};

const FONT_SIZES = {
  small: 'text-2xl',
  medium: 'text-4xl', 
  large: 'text-6xl'
};

const COLORS = ['#FFFFFF', '#000000', '#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF'];

export default function NativeStoryCreator({ open, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTextTools, setShowTextTools] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);

  // Request photo permissions on mount
  useEffect(() => {
    if (open) {
      requestPhotoPermissions();
    }
  }, [open]);

  const requestPhotoPermissions = async () => {
    try {
      const permissions = await Camera.requestPermissions();
      if (permissions.photos === 'granted') {
        // Permissions granted - we can't auto-load photos due to browser/iOS limitations
        // But the user can now select photos
      }
    } catch (error) {
      console.log('Photo permissions not available in browser:', error);
    }
  };

  const handleCameraCapture = async () => {
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
      // Fallback to file input for web
      fileInputRef.current?.click();
    }
  };

  const handlePhotoSelect = async () => {
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
      console.error('Photo selection error:', error);
      // Fallback to file input for web
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Please select an image',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddText = () => {
    setTextOverlay({
      id: Date.now().toString(),
      text: 'Add text',
      style: 'normal',
      position: { x: 50, y: 50 },
      color: '#FFFFFF',
      fontSize: 'medium'
    });
    setIsEditingText(true);
    setShowTextTools(true);
  };

  const handleTextDrag = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || !textOverlay) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = 'touches' in e 
      ? ((e.touches[0].clientX - rect.left) / rect.width) * 100
      : ((e.nativeEvent.clientX - rect.left) / rect.width) * 100;
    const y = 'touches' in e
      ? ((e.touches[0].clientY - rect.top) / rect.height) * 100
      : ((e.nativeEvent.clientY - rect.top) / rect.height) * 100;
    
    setTextOverlay({
      ...textOverlay,
      position: { 
        x: Math.max(10, Math.min(90, x)), 
        y: Math.max(10, Math.min(90, y)) 
      }
    });
  };

  const renderImageToCanvas = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx || !selectedImage) {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        if (textOverlay) {
          const x = (textOverlay.position.x / 100) * canvas.width;
          const y = (textOverlay.position.y / 100) * canvas.height;
          
          let fontSize = 48;
          if (textOverlay.fontSize === 'small') fontSize = 32;
          if (textOverlay.fontSize === 'large') fontSize = 64;
          
          ctx.font = `${textOverlay.style === 'bold' ? 'bold ' : ''}${fontSize}px sans-serif`;
          ctx.fillStyle = textOverlay.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (textOverlay.style === 'outline') {
            ctx.strokeStyle = textOverlay.color === '#FFFFFF' ? '#000000' : '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.strokeText(textOverlay.text, x, y);
          }
          
          ctx.fillText(textOverlay.text, x, y);
        }

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.9);
      };
      img.src = selectedImage;
    });
  };

  const handleShare = async () => {
    if (!selectedImage || !user) return;
    
    setUploading(true);
    try {
      const imageBlob = await renderImageToCanvas();
      if (!imageBlob) throw new Error('Failed to process image');

      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, imageBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: urlData.publicUrl,
          media_type: 'image',
          caption: textOverlay?.text || null
        });

      if (dbError) throw dbError;

      toast({
        title: 'Story shared!',
        description: 'Your story is now live'
      });
      
      onSuccess?.();
      onClose();
      setSelectedImage(null);
      setTextOverlay(null);
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Failed to share',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-screen p-0 bg-black">
          {!selectedImage ? (
            // Gallery View
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white"
                >
                  <X className="h-6 w-6" />
                </Button>
                
                <h2 className="text-white font-semibold">Add to story</h2>
                
                <div className="w-10" />
              </div>

              {/* Add yours button */}
              <div className="px-4 mb-4">
                <button 
                  onClick={handleCameraCapture}
                  className="w-full bg-gray-800 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-700 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white text-xl">+</span>
                  </div>
                  <span className="text-white font-medium">Add yours</span>
                </button>
              </div>

              {/* Recents Header */}
              <div className="flex items-center justify-between px-4 pb-2">
                <button className="flex items-center gap-1 text-white">
                  <span className="font-medium">Recents</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button className="p-2">
                  <Grid3x3 className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Image Grid */}
              <div className="flex-1 overflow-y-auto bg-black">
                <div className="grid grid-cols-3 gap-0.5">
                  {/* Camera Button */}
                  <button
                    onClick={handleCameraCapture}
                    className="aspect-square bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition"
                  >
                    <CameraIcon className="h-8 w-8 text-gray-400" />
                  </button>
                  
                  {/* Select from Library Button */}
                  <button
                    onClick={handlePhotoSelect}
                    className="aspect-square bg-gray-900 hover:bg-gray-800 transition flex items-center justify-center"
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-1">🖼️</div>
                      <p className="text-gray-400 text-xs">Select</p>
                    </div>
                  </button>
                  
                  {/* Placeholder cells */}
                  {[...Array(25)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-900"
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Edit View
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedImage(null)}
                  className="text-white bg-black/30"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Image with text overlay */}
              <div 
                className="flex-1 relative flex items-center justify-center"
                onMouseMove={handleTextDrag}
                onMouseUp={() => setIsDragging(false)}
                onTouchMove={handleTextDrag}
                onTouchEnd={() => setIsDragging(false)}
              >
                <img 
                  src={selectedImage} 
                  alt="Story"
                  className="max-w-full max-h-full object-contain"
                />
                
                {textOverlay && (
                  <div
                    className={cn(
                      "absolute cursor-move select-none transition-all",
                      TEXT_STYLES[textOverlay.style],
                      FONT_SIZES[textOverlay.fontSize]
                    )}
                    style={{
                      left: `${textOverlay.position.x}%`,
                      top: `${textOverlay.position.y}%`,
                      color: textOverlay.color,
                      transform: 'translate(-50%, -50%)',
                      textShadow: textOverlay.style === 'outline' 
                        ? `0 0 10px ${textOverlay.color === '#FFFFFF' ? '#000000' : '#FFFFFF'}` 
                        : undefined
                    }}
                    onMouseDown={() => setIsDragging(true)}
                    onTouchStart={() => setIsDragging(true)}
                    onClick={() => setIsEditingText(true)}
                  >
                    {isEditingText ? (
                      <input
                        type="text"
                        value={textOverlay.text}
                        onChange={(e) => setTextOverlay({ ...textOverlay, text: e.target.value })}
                        onBlur={() => setIsEditingText(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingText(false)}
                        className="bg-transparent border-none outline-none text-center min-w-[100px]"
                        style={{ color: textOverlay.color }}
                        autoFocus
                      />
                    ) : (
                      textOverlay.text
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                {/* Text Tools */}
                {showTextTools && textOverlay && (
                  <div className="bg-black/50 rounded-lg p-3 space-y-2">
                    {/* Style buttons */}
                    <div className="flex gap-2">
                      {(['normal', 'bold', 'outline'] as const).map(style => (
                        <button
                          key={style}
                          onClick={() => setTextOverlay({ ...textOverlay, style })}
                          className={cn(
                            "px-3 py-1 rounded text-sm",
                            textOverlay.style === style 
                              ? "bg-white text-black" 
                              : "bg-gray-700 text-white"
                          )}
                        >
                          {style === 'normal' ? 'Regular' : style.charAt(0).toUpperCase() + style.slice(1)}
                        </button>
                      ))}
                    </div>
                    
                    {/* Color picker */}
                    <div className="flex gap-2">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setTextOverlay({ ...textOverlay, color })}
                          className="w-8 h-8 rounded-full border-2"
                          style={{ 
                            backgroundColor: color,
                            borderColor: textOverlay.color === color ? '#fff' : 'transparent'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddText}
                    variant="secondary"
                    className="flex-1"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>
                  
                  <Button
                    onClick={handleShare}
                    disabled={uploading}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {uploading ? 'Sharing...' : 'Share'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}