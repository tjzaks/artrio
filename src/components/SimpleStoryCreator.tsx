import { useState, useRef, useEffect } from 'react';
import { 
  X, Type, Send, ChevronDown, Camera, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

export default function SimpleStoryCreator({ open, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTextTools, setShowTextTools] = useState(false);

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

  const renderFinalImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!selectedImage || !canvasRef.current) {
        reject(new Error('No image'));
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        if (textOverlay && textOverlay.text) {
          const x = (textOverlay.position.x / 100) * img.width;
          const y = (textOverlay.position.y / 100) * img.height;
          
          const fontSize = {
            small: img.height * 0.05,
            medium: img.height * 0.08,
            large: img.height * 0.12
          }[textOverlay.fontSize];
          
          ctx.font = `${textOverlay.style === 'bold' ? 'bold' : 'normal'} ${fontSize}px -apple-system, Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (textOverlay.style === 'outline') {
            ctx.strokeStyle = textOverlay.color === '#FFFFFF' ? '#000000' : '#FFFFFF';
            ctx.lineWidth = fontSize / 15;
            ctx.strokeText(textOverlay.text, x, y);
          }
          
          ctx.fillStyle = textOverlay.color;
          ctx.fillText(textOverlay.text, x, y);
        }
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image'));
        }, 'image/jpeg', 0.95);
      };
      
      img.src = selectedImage;
    });
  };

  const handleShare = async () => {
    if (!selectedImage) return;
    
    setUploading(true);
    try {
      const blob = await renderFinalImage();
      
      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user?.id,
          media_url: publicUrl,
          media_type: 'image',
          caption: textOverlay?.text || null
        });

      if (storyError) throw storyError;

      toast({
        title: 'Story shared!',
        description: 'Your story is now live'
      });

      onSuccess?.();
      onClose();
      
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
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white"
              >
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </div>

            {/* Add yours placeholder */}
            <div className="px-4 mb-4">
              <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
                  <span className="text-white text-xl">+</span>
                </div>
                <span className="text-white font-medium">Add yours</span>
              </div>
            </div>

            {/* Recents Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <button className="flex items-center gap-1 text-white">
                <span>Recents</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              <button className="p-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-0.5">
                {/* Camera Button */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="aspect-square bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition"
                >
                  <Camera className="h-10 w-10 text-gray-400" />
                </button>
                
                {/* Gallery Button - Allow multiple selection */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-gray-900 hover:bg-gray-800 transition col-span-2 row-span-2"
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-2">🖼️</div>
                      <p className="text-gray-400 text-sm">Select photos</p>
                      <p className="text-gray-500 text-xs mt-1">Tap to choose</p>
                    </div>
                  </div>
                </button>
                
                {/* Placeholder images */}
                {[...Array(20)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-gray-800 hover:opacity-80 transition"
                  >
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                  </button>
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
                      className="bg-transparent outline-none border-b-2 border-current"
                      autoFocus
                      maxLength={30}
                    />
                  ) : (
                    textOverlay.text
                  )}
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 z-40">
              {showTextTools && textOverlay && (
                <div className="bg-black/80 p-4 space-y-3">
                  {/* Text styles */}
                  <div className="flex gap-2 justify-center">
                    {(['normal', 'bold', 'outline'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => setTextOverlay({ ...textOverlay, style })}
                        className={cn(
                          "px-4 py-2 rounded-full text-white text-sm",
                          textOverlay.style === style ? "bg-white/30" : "bg-white/10"
                        )}
                      >
                        {style === 'normal' ? 'Aa' : style === 'bold' ? 'AA' : 'A̲a̲'}
                      </button>
                    ))}
                  </div>
                  
                  {/* Colors */}
                  <div className="flex gap-2 justify-center">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setTextOverlay({ ...textOverlay, color })}
                        className={cn(
                          "w-8 h-8 rounded-full border-2",
                          textOverlay.color === color ? "border-white" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gradient-to-t from-black to-transparent">
                <Button
                  variant="ghost"
                  onClick={handleAddText}
                  className="text-white"
                >
                  <Type className="h-6 w-6" />
                </Button>

                <Button
                  onClick={handleShare}
                  disabled={uploading}
                  className="bg-white text-black hover:bg-gray-100 px-8"
                  size="lg"
                >
                  {uploading ? 'Sharing...' : 'Share'}
                </Button>

                <div className="w-10" />
              </div>
            </div>
          </div>
        )}

        {/* Hidden Inputs */}
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
      </SheetContent>
    </Sheet>
  );
}