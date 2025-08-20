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
      
      // For iOS, we can't directly access the photo library
      // We need to use the Camera plugin with Photos source
      // This is a limitation of iOS privacy
      
      // Load any previously selected photos from storage
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
        ) : recentPhotos.length === 0 ? (
          // No photos yet - show instruction
          <div className="px-4 py-8">
            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">📸</div>
              <h3 className="text-white font-medium mb-2">Grant Photo Access</h3>
              <p className="text-gray-400 text-sm mb-4">
                Allow Artrio to access your photos to create stories. 
                Your photos stay private and are never uploaded without your permission.
              </p>
              <Button 
                onClick={async () => {
                  await loadRecentPhotos();
                  if (recentPhotos.length === 0) {
                    handlePhotoSelect();
                  }
                }}
                className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
              >
                Allow Photo Access
              </Button>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-0.5">
              {/* Camera Button */}
              <button
                onClick={handleCameraCapture}
                className="aspect-square bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition rounded-tl-lg"
              >
                <CameraIcon className="h-8 w-8 text-gray-400" />
              </button>
              
              {/* Empty cells */}
              {[...Array(29)].map((_, i) => (
                <div 
                  key={i} 
                  className={`aspect-square bg-gray-900 ${i === 28 ? 'rounded-br-lg' : ''}`} 
                />
              ))}
            </div>
          </div>
        ) : (
          // We have photos - show them Instagram style
          <div className="grid grid-cols-3 gap-0.5">
            {/* Camera Button - Top left only */}
            <button
              onClick={handleCameraCapture}
              className="aspect-square bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition"
            >
              <CameraIcon className="h-8 w-8 text-gray-400" />
            </button>
            
            {/* Recent photos starting from cell 2 */}
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
            
            {/* Add more photos button if we have less than a full grid */}
            {recentPhotos.length < 29 && (
              <button
                onClick={handlePhotoSelect}
                className="aspect-square bg-gray-800 hover:bg-gray-700 transition flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">+</div>
                  <p className="text-gray-400 text-xs">Add More</p>
                </div>
              </button>
            )}
            
            {/* Fill remaining cells */}
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