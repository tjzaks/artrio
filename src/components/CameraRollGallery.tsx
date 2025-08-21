import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { 
  X, Camera as CameraIcon, ChevronDown, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhotoLibrary, { Photo } from '@/plugins/PhotoLibrary';

interface CameraRollGalleryProps {
  onPhotoSelect: (photo: string) => void;
  onClose: () => void;
}

export default function CameraRollGallery({ onPhotoSelect, onClose }: CameraRollGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  
  const PHOTOS_PER_PAGE = 30;

  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      loadPhotos(true);
    } else {
      // For web/other platforms, just show camera option
      setLoading(false);
    }
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePhotos();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreTriggerRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, offset]);

  const loadPhotos = async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
        setOffset(0);
        setPhotos([]);
      }
      
      const result = await PhotoLibrary.loadRecentPhotos({ 
        count: PHOTOS_PER_PAGE, 
        offset: 0 
      });
      
      if (result.needsPermission) {
        setNeedsPermission(true);
        setPermissionDenied(result.permissionDenied || false);
      } else {
        console.log(`Loaded ${result.photos.length} photos from device`);
        setPhotos(result.photos);
        setHasMore(result.hasMore || false);
        setOffset(result.photos.length);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePhotos = async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const result = await PhotoLibrary.loadRecentPhotos({ 
        count: PHOTOS_PER_PAGE, 
        offset: offset 
      });
      
      if (result.photos.length > 0) {
        setPhotos(prev => [...prev, ...result.photos]);
        setHasMore(result.hasMore || false);
        setOffset(prev => prev + result.photos.length);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more photos:', error);
    } finally {
      setLoadingMore(false);
    }
  };
  
  const requestPermission = async () => {
    await loadPhotos(true);
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
        onPhotoSelect(image.dataUrl);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const handlePhotoTap = (photo: Photo) => {
    onPhotoSelect(`data:image/jpeg;base64,${photo.data}`);
  };

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Load more when user scrolls to bottom 200px
    if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !loadingMore) {
      loadMorePhotos();
    }
  }, [hasMore, loadingMore]);

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-gray-800"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <h2 className="text-white font-semibold">Add to story</h2>
        
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Recents Dropdown */}
      <div className="flex items-center px-4 py-3 border-b border-gray-800">
        <button className="flex items-center gap-2 text-white">
          <span className="text-lg font-medium">Recents</span>
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Photo Grid Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : needsPermission ? (
          // Permission needed screen
          <div className="flex items-center justify-center h-full px-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-white text-xl font-medium mb-3">
                {permissionDenied ? 'Photo Access Denied' : 'Allow Photo Access'}
              </h3>
              <p className="text-gray-400 mb-6">
                {permissionDenied 
                  ? 'Please enable photo access in Settings to add photos to your story'
                  : 'To add photos to your story, allow access to your photo library'}
              </p>
              {permissionDenied ? (
                <Button 
                  onClick={() => {
                    // This will open iOS settings
                    if (Capacitor.getPlatform() === 'ios') {
                      window.open('app-settings:', '_blank');
                    }
                  }}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  Open Settings
                </Button>
              ) : (
                <Button 
                  onClick={requestPermission}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  Allow Access
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px] p-[2px]">
            {/* Camera Button - Always first */}
            <button
              onClick={handleCameraCapture}
              className="aspect-square bg-gray-900 flex flex-col items-center justify-center hover:bg-gray-800 transition-colors"
            >
              <CameraIcon className="h-8 w-8 text-gray-400 mb-1" />
              <span className="text-xs text-gray-400">Camera</span>
            </button>
            
            {/* Photo Grid */}
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => handlePhotoTap(photo)}
                className="aspect-square bg-gray-900 overflow-hidden hover:opacity-80 transition-opacity"
              >
                <img 
                  src={`data:image/jpeg;base64,${photo.data}`}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
            
            {/* Loading more indicator */}
            {loadingMore && (
              <div className="aspect-square bg-gray-900 flex items-center justify-center col-span-3">
                <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />
              </div>
            )}
            
            {/* Infinite scroll trigger */}
            {hasMore && !loadingMore && (
              <div 
                ref={loadMoreTriggerRef} 
                className="h-1 col-span-3"
              />
            )}
            
            {/* End of photos message */}
            {!hasMore && photos.length > 0 && (
              <div className="col-span-3 py-8 text-center">
                <p className="text-gray-500 text-sm">End of photos</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}