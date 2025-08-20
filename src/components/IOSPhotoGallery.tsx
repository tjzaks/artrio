import { useState, useEffect, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Media, MediaAsset } from '@capacitor-community/media';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { 
  X, ChevronDown, Camera as CameraIcon, Grid3x3, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IOSPhotoGalleryProps {
  onPhotoSelect: (photo: string) => void;
  onClose: () => void;
}

// Lazy-loading thumbnail component for performance
const PhotoThumbnail = ({ photo, onClick }: { photo: string; onClick: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: '50px' }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <button
      ref={ref}
      onClick={onClick}
      className="aspect-square bg-gray-900 overflow-hidden hover:opacity-80 transition"
    >
      {isVisible && !hasError && (
        <img 
          src={photo} 
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      )}
      {hasError && (
        <div className="w-full h-full flex items-center justify-center">
          <Image className="h-8 w-8 text-gray-600" />
        </div>
      )}
    </button>
  );
};

export default function IOSPhotoGallery({ onPhotoSelect, onClose }: IOSPhotoGalleryProps) {
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadRecentPhotos();
    
    // Refresh photos when app becomes active (like Instagram)
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        loadRecentPhotos();
      }
    });
    
    return () => {
      appStateListener.remove();
    };
  }, []);

  const loadRecentPhotos = async () => {
    try {
      setLoading(true);
      console.log('🔥 STARTING PHOTO LOAD - Platform:', Capacitor.getPlatform());
      
      // AGGRESSIVE DEBUGGING: Try every possible Media plugin approach
      try {
        console.log('🔥 Step 1: Testing Media plugin availability');
        
        // Test 1: Simple call
        console.log('🔥 Step 2: Calling Media.getMedias...');
        const result = await Media.getMedias({
          quantity: 20,
          types: 'photos'
        });
        
        console.log('🔥 Step 3: Media result:', JSON.stringify(result, null, 2));
        
        if (result && result.medias) {
          console.log('🔥 Step 4: Found', result.medias.length, 'media items');
          
          if (result.medias.length > 0) {
            console.log('🔥 Step 5: First media item:', JSON.stringify(result.medias[0], null, 2));
            
            // Try different approaches for each media item
            const photoPromises = result.medias.slice(0, 10).map(async (media: MediaAsset, index: number) => {
              console.log(`🔥 Processing media ${index}:`, JSON.stringify(media, null, 2));
              
              // Approach 1: Direct path
              if (media.path) {
                console.log(`🔥 Media ${index} has direct path:`, media.path);
                const converted = Capacitor.convertFileSrc(media.path);
                console.log(`🔥 Media ${index} converted path:`, converted);
                return converted;
              }
              
              // Approach 2: Get by identifier
              if (media.identifier) {
                try {
                  console.log(`🔥 Media ${index} trying getMediaByIdentifier:`, media.identifier);
                  const mediaData = await Media.getMediaByIdentifier({
                    identifier: media.identifier
                  });
                  console.log(`🔥 Media ${index} getMediaByIdentifier result:`, JSON.stringify(mediaData, null, 2));
                  
                  if (mediaData.path) {
                    const converted = Capacitor.convertFileSrc(mediaData.path);
                    console.log(`🔥 Media ${index} final converted:`, converted);
                    return converted;
                  }
                } catch (e) {
                  console.error(`🔥 Media ${index} getMediaByIdentifier failed:`, e);
                }
              }
              
              // Approach 3: Check for data URL
              if ((media as any).dataUrl) {
                console.log(`🔥 Media ${index} has dataUrl`);
                return (media as any).dataUrl;
              }
              
              console.log(`🔥 Media ${index} - no valid path found`);
              return null;
            });
            
            const photoResults = await Promise.all(photoPromises);
            console.log('🔥 Step 6: Photo results:', photoResults);
            
            const validPhotos = photoResults.filter(p => p !== null) as string[];
            console.log('🔥 Step 7: Valid photos count:', validPhotos.length);
            
            if (validPhotos.length > 0) {
              console.log('🔥 SUCCESS: Setting photos!', validPhotos);
              setRecentPhotos(validPhotos);
              setHasPermission(true);
              localStorage.setItem('recentStoryPhotos', JSON.stringify(validPhotos));
              return;
            }
          }
        } else {
          console.log('🔥 No result or no medias property');
        }
      } catch (mediaError) {
        console.error('🔥 MEDIA PLUGIN ERROR:', mediaError);
      }
      
      // Fallback to cache
      console.log('🔥 Step 8: Falling back to cache');
      const stored = localStorage.getItem('recentStoryPhotos');
      if (stored) {
        try {
          const photos = JSON.parse(stored);
          console.log('🔥 Loaded from cache:', photos.length, 'photos');
          setRecentPhotos(photos.slice(0, 30));
          setHasPermission(true);
        } catch (e) {
          console.error('🔥 Failed to parse stored photos');
        }
      }
      
      setHasPermission(true);
    } catch (error) {
      console.error('🔥 TOTAL ERROR:', error);
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
            
            {/* Recent photos using lazy-loading component */}
            {recentPhotos.map((photo, index) => (
              <PhotoThumbnail
                key={`photo-${index}`}
                photo={photo}
                onClick={() => onPhotoSelect(photo)}
              />
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