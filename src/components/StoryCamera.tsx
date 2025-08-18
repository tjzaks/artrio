import { useState, useRef, useEffect } from 'react';
import { Camera, X, Type, Send, ImageIcon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StoryOverlayText {
  text: string;
  style: 'classic' | 'modern' | 'bold' | 'neon' | 'typewriter';
  position: { x: number; y: number };
  color: string;
  fontSize: 'small' | 'medium' | 'large' | 'huge';
}

interface StoryCameraProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TEXT_STYLES = {
  classic: 'font-sans',
  modern: 'font-mono tracking-wide',
  bold: 'font-black uppercase',
  neon: 'font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]',
  typewriter: 'font-mono bg-black/80 px-3 py-1 rounded'
};

const FONT_SIZES = {
  small: 'text-xl',
  medium: 'text-3xl',
  large: 'text-5xl',
  huge: 'text-7xl'
};

const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#FF1493'
];

export default function StoryCamera({ open, onClose, onSuccess }: StoryCameraProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState<StoryOverlayText>({
    text: '',
    style: 'classic',
    position: { x: 50, y: 50 },
    color: '#FFFFFF',
    fontSize: 'medium'
  });
  const [isEditingText, setIsEditingText] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setPreview(imageUrl);
      setOriginalImage(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleTextDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTextOverlay(prev => ({
      ...prev,
      position: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
    }));
  };

  const renderImageWithText = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!originalImage || !canvasRef.current) {
        reject(new Error('No image to render'));
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Add text if present
        if (textOverlay.text) {
          ctx.fillStyle = textOverlay.color;
          
          // Calculate font size based on image dimensions
          const baseFontSize = {
            small: img.height * 0.04,
            medium: img.height * 0.06,
            large: img.height * 0.08,
            huge: img.height * 0.10
          }[textOverlay.fontSize];
          
          // Apply text style
          let fontFamily = 'Arial';
          if (textOverlay.style === 'modern') fontFamily = 'Courier New';
          if (textOverlay.style === 'bold') {
            ctx.font = `bold ${baseFontSize}px ${fontFamily}`;
            ctx.fillText(
              textOverlay.text.toUpperCase(),
              (textOverlay.position.x / 100) * img.width,
              (textOverlay.position.y / 100) * img.height
            );
          } else if (textOverlay.style === 'neon') {
            ctx.shadowColor = textOverlay.color;
            ctx.shadowBlur = 20;
            ctx.font = `bold ${baseFontSize}px Arial`;
            ctx.fillText(
              textOverlay.text,
              (textOverlay.position.x / 100) * img.width,
              (textOverlay.position.y / 100) * img.height
            );
          } else if (textOverlay.style === 'typewriter') {
            // Draw background
            const textMetrics = ctx.measureText(textOverlay.text);
            const padding = baseFontSize * 0.3;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(
              (textOverlay.position.x / 100) * img.width - padding,
              (textOverlay.position.y / 100) * img.height - baseFontSize - padding,
              textMetrics.width + padding * 2,
              baseFontSize + padding * 2
            );
            
            // Draw text
            ctx.fillStyle = textOverlay.color;
            ctx.font = `${baseFontSize}px Courier New`;
            ctx.fillText(
              textOverlay.text,
              (textOverlay.position.x / 100) * img.width,
              (textOverlay.position.y / 100) * img.height
            );
          } else {
            ctx.font = `${baseFontSize}px ${fontFamily}`;
            ctx.fillText(
              textOverlay.text,
              (textOverlay.position.x / 100) * img.width,
              (textOverlay.position.y / 100) * img.height
            );
          }
        }
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.95);
      };
      
      img.src = originalImage;
    });
  };

  const uploadStory = async () => {
    if (!preview) return;
    
    setUploading(true);
    try {
      // Render image with text overlay
      const blob = await renderImageWithText();
      
      // Upload to Supabase storage
      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
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

      // Create story record
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user?.id,
          media_url: publicUrl,
          media_type: 'image',
          caption: textOverlay.text || null
        });

      if (storyError) throw storyError;

      toast({
        title: 'Story posted!',
        description: 'Your story will be visible for 24 hours'
      });

      reset();
      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error uploading story:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload your story',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setOriginalImage(null);
    setTextOverlay({
      text: '',
      style: 'classic',
      position: { x: 50, y: 50 },
      color: '#FFFFFF',
      fontSize: 'medium'
    });
    setIsEditingText(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="relative h-[600px] bg-black">
            {!preview ? (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="space-y-4 w-full max-w-xs">
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    size="lg"
                    className="w-full h-20 text-lg"
                    variant="outline"
                  >
                    <Camera className="h-8 w-8 mr-3" />
                    Take Photo
                  </Button>
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="lg"
                    className="w-full h-20 text-lg"
                    variant="outline"
                  >
                    <ImageIcon className="h-8 w-8 mr-3" />
                    Choose from Gallery
                  </Button>
                  
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Image Preview with Text Overlay */}
                <div 
                  className="relative h-full flex items-center justify-center"
                  onMouseMove={handleTextDrag}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                >
                  <img 
                    src={preview} 
                    alt="Story"
                    className="max-w-full max-h-full object-contain"
                  />
                  
                  {/* Text Overlay */}
                  {textOverlay.text && (
                    <div
                      className={cn(
                        "absolute cursor-move select-none",
                        TEXT_STYLES[textOverlay.style],
                        FONT_SIZES[textOverlay.fontSize]
                      )}
                      style={{
                        left: `${textOverlay.position.x}%`,
                        top: `${textOverlay.position.y}%`,
                        color: textOverlay.color,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onMouseDown={() => setIsDragging(true)}
                      onClick={() => setIsEditingText(true)}
                    >
                      {textOverlay.text}
                    </div>
                  )}
                  
                  {/* Top Controls */}
                  <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
                    <div className="flex justify-between items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={reset}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingText(true)}
                        className="text-white hover:bg-white/20"
                      >
                        <Type className="h-5 w-5 mr-2" />
                        Add Text
                      </Button>
                    </div>
                  </div>
                  
                  {/* Bottom Controls */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <Button
                      onClick={uploadStory}
                      disabled={uploading}
                      className="w-full"
                      size="lg"
                    >
                      {uploading ? 'Posting...' : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Share Story
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Hidden Canvas for Rendering */}
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Editor Dialog */}
      <Dialog open={isEditingText} onOpenChange={setIsEditingText}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Type your text..."
              value={textOverlay.text}
              onChange={(e) => setTextOverlay(prev => ({ ...prev, text: e.target.value }))}
              className="w-full p-3 text-lg bg-transparent border-b-2 focus:outline-none"
              autoFocus
              maxLength={50}
            />
            
            {/* Text Styles */}
            <div className="flex gap-2 flex-wrap">
              {Object.keys(TEXT_STYLES).map((style) => (
                <Button
                  key={style}
                  size="sm"
                  variant={textOverlay.style === style ? 'default' : 'outline'}
                  onClick={() => setTextOverlay(prev => ({ ...prev, style: style as any }))}
                  className="capitalize"
                >
                  {style}
                </Button>
              ))}
            </div>
            
            {/* Font Sizes */}
            <div className="flex gap-2">
              {Object.keys(FONT_SIZES).map((size) => (
                <Button
                  key={size}
                  size="sm"
                  variant={textOverlay.fontSize === size ? 'default' : 'outline'}
                  onClick={() => setTextOverlay(prev => ({ ...prev, fontSize: size as any }))}
                  className="capitalize"
                >
                  {size}
                </Button>
              ))}
            </div>
            
            {/* Colors */}
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-8 h-8 rounded-full border-2",
                    textOverlay.color === color ? 'border-primary' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setTextOverlay(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
            
            <Button onClick={() => setIsEditingText(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}