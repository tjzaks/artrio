import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Media } from '@capacitor-community/media';
import { 
  X, ChevronDown, Camera as CameraIcon, Grid3x3, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IOSPhotoGalleryProps {
  onPhotoSelect: (photo: string) => void;
  onClose: () => void;
}

export default function IOSPhotoGallery({ onPhotoSelect, onClose }: IOSPhotoGalleryProps) {
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadRecentPhotos();
  }, []);

  const loadRecentPhotos = async () => {
    try {
      setLoading(true);
      
      // Try to load photos from the Media plugin
      try {
        const result = await Media.getMedias({
          quantity: 30,
          types: 'photos',
          thumbnailWidth: 400,
          thumbnailHeight: 400,
          thumbnailQuality: 80
        });
        
        console.log('Media result:', result);
        
        if (result && result.medias && result.medias.length > 0) {
          // Extract photo URLs - try different possible properties
          const photoUrls = result.medias.map((media: any) => {
            // Check all possible properties where the image might be
            if (media.thumbnailDataUrl) return media.thumbnailDataUrl;
            if (media.dataUrl) return media.dataUrl;
            if (media.path) return media.path;
            if (media.webPath) return media.webPath;
            if (media.uri) return media.uri;
            if (media.identifier) {
              // On iOS, we might need to construct a URL from the identifier
              return `capacitor://localhost/_capacitor_file_${media.identifier}`;
            }
            return '';
          }).filter((url: string) => url !== '');
          
          if (photoUrls.length > 0) {
            setRecentPhotos(photoUrls);
            setHasPermission(true);
            // Save to storage for future use
            localStorage.setItem('recentStoryPhotos', JSON.stringify(photoUrls));
            return; // Success!
          }
        }
      } catch (mediaError) {
        console.error('Media plugin error:', mediaError);
      }
      
      // Fall back to loading from storage
      const stored = localStorage.getItem('recentStoryPhotos');
      if (stored) {
        const photos = JSON.parse(stored);
        setRecentPhotos(photos.slice(0, 50));
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToRecentPhotos = (imageUrl: string) => {
    try {
      const stored = localStorage.getItem('recentStoryPhotos');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [imageUrl, ...existing.filter((p: string) => p !== imageUrl)].slice(0, 50);
      localStorage.setItem('recentStoryPhotos', JSON.stringify(updated));
      setRecentPhotos(updated);
    } catch (error) {
      console.error('Error saving recent photo:', error);
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
        saveToRecentPhotos(image.dataUrl);
        onPhotoSelect(image.dataUrl);
      }
    } catch (error) {
      console.error('Camera error:', error);
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
        saveToRecentPhotos(image.dataUrl);
        onPhotoSelect(image.dataUrl);
      }
    } catch (error) {
      console.error('Photo selection error:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black">
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
        
        <div className="w-10" />
        <div className="w-10" />
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

      {/* Photo Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          // Loading state
          <div className="grid grid-cols-3 gap-0.5">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i} 
                className="aspect-square bg-gray-900 animate-pulse" 
              />
            ))}
          </div>
        ) : (
          // Show camera and library buttons with any photos
          <div className="grid grid-cols-3 gap-0.5">
            {/* Camera Button - Always first */}
            <button
              onClick={handleCameraCapture}
              className="aspect-square bg-gray-900 flex flex-col items-center justify-center hover:bg-gray-800 transition"
            >
              <CameraIcon className="h-8 w-8 text-gray-400 mb-1" />
              <span className="text-gray-400 text-xs">Camera</span>
            </button>
            
            {/* Photo Library Button - Always second */}
            <button
              onClick={handlePhotoSelect}
              className="aspect-square bg-gray-900 flex flex-col items-center justify-center hover:bg-gray-800 transition"
            >
              <Image className="h-8 w-8 text-gray-400 mb-1" />
              <span className="text-gray-400 text-xs">Library</span>
            </button>
            
            {/* Recent photos if any */}
            {recentPhotos.map((photo, index) => (
              <button
                key={index}
                onClick={() => onPhotoSelect(photo)}
                className="aspect-square bg-gray-900 overflow-hidden hover:opacity-80 transition"
              >
                <img 
                  src={photo} 
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            
            {/* Fill remaining cells with empty squares */}
            {recentPhotos.length < 28 && (
              [...Array(28 - recentPhotos.length)].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-gray-900" />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}