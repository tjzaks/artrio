import { useState, useRef, useEffect } from 'react';
import { 
  X, Type, Send, Music, Sparkles, Image as ImageIcon, 
  Camera, ChevronDown, Grid3x3, Palette, Sticker,
  Volume2, VolumeX
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
  style: 'classic' | 'modern' | 'bold' | 'neon' | 'typewriter' | 'rainbow';
  position: { x: number; y: number };
  color: string;
  fontSize: number;
  rotation: number;
}

interface Template {
  id: string;
  name: string;
  preview: string;
  overlay?: string;
  filter?: string;
}

const TEMPLATES: Template[] = [
  { id: 'none', name: 'Original', preview: '📷' },
  { id: 'vintage', name: 'Vintage', preview: '🎞️', filter: 'sepia(50%) contrast(1.2)' },
  { id: 'bw', name: 'Black & White', preview: '⚫', filter: 'grayscale(100%)' },
  { id: 'bright', name: 'Bright', preview: '☀️', filter: 'brightness(1.2) contrast(1.1)' },
  { id: 'dream', name: 'Dreamy', preview: '✨', filter: 'blur(0.5px) brightness(1.1)' },
  { id: 'cold', name: 'Cold', preview: '❄️', filter: 'hue-rotate(180deg) saturate(0.8)' },
];

const TEXT_STYLES = {
  classic: 'font-sans',
  modern: 'font-mono tracking-wide',
  bold: 'font-black uppercase',
  neon: 'font-bold animate-pulse drop-shadow-[0_0_20px_currentColor]',
  typewriter: 'font-mono bg-black/80 px-3 py-1 rounded',
  rainbow: 'font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent'
};

export default function InstagramStoryCreator({ open, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [view, setView] = useState<'camera' | 'gallery' | 'edit'>('gallery');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recentImages, setRecentImages] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentTool, setCurrentTool] = useState<'none' | 'text' | 'music' | 'templates'>('none');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  // Load recent images from device (mock for now)
  useEffect(() => {
    // In a real app, this would access device photos
    // For now, we'll just show placeholders
    const mockRecents = [
      '/api/placeholder/300/400',
      '/api/placeholder/301/400',
      '/api/placeholder/302/400',
      '/api/placeholder/303/400',
    ];
    setRecentImages(mockRecents);
  }, []);

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
      setSelectedImage(reader.result as string);
      setView('edit');
    };
    reader.readAsDataURL(file);
  };

  const handleAddText = () => {
    const newText: TextOverlay = {
      id: Date.now().toString(),
      text: 'Tap to edit',
      style: 'classic',
      position: { x: 50, y: 50 },
      color: '#FFFFFF',
      fontSize: 24,
      rotation: 0
    };
    setTextOverlays([...textOverlays, newText]);
    setCurrentTool('none');
  };

  const handleTextEdit = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(prev => 
      prev.map(text => text.id === id ? { ...text, ...updates } : text)
    );
  };

  const handleTextDrag = (e: React.TouchEvent | React.MouseEvent, id: string) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = 'touches' in e 
      ? ((e.touches[0].clientX - rect.left) / rect.width) * 100
      : ((e.nativeEvent.clientX - rect.left) / rect.width) * 100;
    const y = 'touches' in e
      ? ((e.touches[0].clientY - rect.top) / rect.height) * 100
      : ((e.nativeEvent.clientY - rect.top) / rect.height) * 100;
    
    handleTextEdit(id, { position: { x, y } });
  };

  const renderFinalImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!selectedImage || !canvasRef.current) {
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
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Apply filter if template has one
        if (selectedTemplate.filter) {
          ctx.filter = selectedTemplate.filter;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Reset filter for text
        ctx.filter = 'none';
        
        // Draw text overlays
        textOverlays.forEach(text => {
          ctx.save();
          
          const x = (text.position.x / 100) * img.width;
          const y = (text.position.y / 100) * img.height;
          
          ctx.translate(x, y);
          ctx.rotate((text.rotation * Math.PI) / 180);
          
          ctx.fillStyle = text.color;
          ctx.font = `bold ${text.fontSize * (img.height / 600)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (text.style === 'neon') {
            ctx.shadowColor = text.color;
            ctx.shadowBlur = 20;
          } else if (text.style === 'typewriter') {
            const metrics = ctx.measureText(text.text);
            const padding = text.fontSize * 0.3;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(
              -metrics.width / 2 - padding,
              -text.fontSize / 2 - padding,
              metrics.width + padding * 2,
              text.fontSize + padding * 2
            );
            ctx.fillStyle = text.color;
          }
          
          ctx.fillText(text.text, 0, 0);
          ctx.restore();
        });
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
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
          caption: textOverlays.map(t => t.text).join(' ')
        });

      if (storyError) throw storyError;

      toast({
        title: 'Story shared!',
        description: 'Your story is now live'
      });

      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error uploading story:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to share your story',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-screen p-0 bg-black">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
            
            <h2 className="text-white font-semibold text-lg">
              {view === 'gallery' ? 'Add to story' : 'Edit story'}
            </h2>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Settings className="h-6 w-6" />
            </Button>
          </div>

          {/* Content Area */}
          <div className="flex-1 relative">
            {view === 'gallery' ? (
              <div className="h-full pt-20 pb-24">
                {/* Tool Cards */}
                <div className="flex gap-4 px-4 mb-6">
                  <button 
                    className="flex-1 bg-white/10 backdrop-blur rounded-2xl p-6 text-white"
                    onClick={() => setCurrentTool('templates')}
                  >
                    <div className="text-4xl mb-2">🎨</div>
                    <div className="font-medium">Templates</div>
                  </button>
                  <button 
                    className="flex-1 bg-white/10 backdrop-blur rounded-2xl p-6 text-white"
                    onClick={() => setCurrentTool('music')}
                  >
                    <div className="text-4xl mb-2">🎵</div>
                    <div className="font-medium">Music</div>
                  </button>
                </div>

                {/* Gallery Header */}
                <div className="flex items-center justify-between px-4 mb-4">
                  <button className="flex items-center gap-2 text-white">
                    <span className="font-medium">Recents</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="text-white">
                    <Grid3x3 className="h-6 w-6" />
                  </button>
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-3 gap-0.5 px-4">
                  {/* Camera Button */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="aspect-square bg-white/10 flex items-center justify-center"
                  >
                    <Camera className="h-8 w-8 text-white" />
                  </button>
                  
                  {/* Recent Images */}
                  {[...Array(8)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-white/5 hover:opacity-80 transition"
                    >
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                    </button>
                  ))}
                </div>
              </div>
            ) : view === 'edit' && selectedImage ? (
              <div 
                className="h-full flex items-center justify-center relative"
                onMouseMove={(e) => isDragging && handleTextDrag(e, isDragging)}
                onMouseUp={() => setIsDragging(null)}
                onTouchMove={(e) => isDragging && handleTextDrag(e, isDragging)}
                onTouchEnd={() => setIsDragging(null)}
              >
                <img 
                  src={selectedImage} 
                  alt="Story"
                  className="max-w-full max-h-full object-contain"
                  style={{ filter: selectedTemplate.filter }}
                />
                
                {/* Text Overlays */}
                {textOverlays.map(text => (
                  <div
                    key={text.id}
                    className={cn(
                      "absolute cursor-move select-none",
                      TEXT_STYLES[text.style]
                    )}
                    style={{
                      left: `${text.position.x}%`,
                      top: `${text.position.y}%`,
                      color: text.color,
                      fontSize: `${text.fontSize}px`,
                      transform: `translate(-50%, -50%) rotate(${text.rotation}deg)`
                    }}
                    onMouseDown={() => setIsDragging(text.id)}
                    onTouchStart={() => setIsDragging(text.id)}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleTextEdit(text.id, { text: e.currentTarget.textContent || '' })}
                  >
                    {text.text}
                  </div>
                ))}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : null}
          </div>

          {/* Bottom Tools */}
          {view === 'edit' && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent">
              {/* Tool Bar */}
              <div className="flex items-center justify-around p-4 mb-4">
                <button
                  onClick={() => setCurrentTool('templates')}
                  className="text-white p-2"
                >
                  <Sparkles className="h-6 w-6" />
                </button>
                <button
                  onClick={handleAddText}
                  className="text-white p-2"
                >
                  <Type className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setCurrentTool('music')}
                  className="text-white p-2"
                >
                  <Music className="h-6 w-6" />
                </button>
                <button
                  className="text-white p-2"
                >
                  <Sticker className="h-6 w-6" />
                </button>
                <button
                  className="text-white p-2"
                >
                  <Palette className="h-6 w-6" />
                </button>
              </div>

              {/* Share Button */}
              <div className="px-4 pb-4">
                <Button
                  onClick={handleShare}
                  disabled={uploading}
                  className="w-full bg-white text-black hover:bg-gray-100"
                  size="lg"
                >
                  {uploading ? 'Sharing...' : 'Share to Story'}
                </Button>
              </div>
            </div>
          )}

          {/* Tool Panels */}
          {currentTool === 'templates' && (
            <div className="absolute bottom-24 left-0 right-0 bg-black/90 backdrop-blur p-4">
              <div className="flex gap-2 overflow-x-auto">
                {TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setCurrentTool('none');
                    }}
                    className={cn(
                      "flex-shrink-0 w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center",
                      selectedTemplate.id === template.id 
                        ? "border-white bg-white/20" 
                        : "border-white/30"
                    )}
                  >
                    <div className="text-2xl">{template.preview}</div>
                    <div className="text-xs text-white mt-1">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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

// Add Settings icon since it's not in lucide-react
const Settings = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);