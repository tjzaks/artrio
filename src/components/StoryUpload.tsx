import { useState, useRef } from 'react';
import { Camera, X, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StoryUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StoryUpload({ open, onClose, onSuccess }: StoryUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image or video',
        variant: 'destructive'
      });
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 50MB',
        variant: 'destructive'
      });
      return;
    }

    setMediaType(isImage ? 'image' : 'video');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadStory = async () => {
    if (!preview || !mediaType) return;
    
    setUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(preview);
      const blob = await response.blob();
      
      // Upload to Supabase storage
      const fileName = `${user?.id}-${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, {
          contentType: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
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
          media_type: mediaType,
          caption: caption.trim() || null
        });

      if (storyError) throw storyError;

      toast({
        title: 'Story posted!',
        description: 'Your story will be visible for 24 hours'
      });

      // Reset and close
      setPreview(null);
      setMediaType(null);
      setCaption('');
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
    setMediaType(null);
    setCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Your Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview ? (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images or videos (max 50MB)
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[400px]">
                {mediaType === 'image' ? (
                  <img 
                    src={preview} 
                    alt="Story preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video 
                    src={preview}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={reset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Caption */}
              <Input
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
              />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={uploading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={uploadStory}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Share Story
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}