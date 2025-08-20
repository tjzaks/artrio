import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { 
  X, ChevronDown, Camera as CameraIcon, Grid3x3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhotoLibrary, { Photo } from '@/plugins/PhotoLibrary';

interface NativeGalleryProps {
  onPhotoSelect: (photo: string) => void;
  onClose: () => void;
}

export default function NativeGallery({ onPhotoSelect, onClose }: NativeGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      loadPhotos();
    } else {
      setLoading(false);
    }
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const result = await PhotoLibrary.loadRecentPhotos({ count: 100 });
      
      if (result.needsPermission) {
        setNeedsPermission(true);
        setPermissionDenied(result.permissionDenied || false);
      } else {
        console.log(`Loaded ${result.photos.length} photos from device`);
        setPhotos(result.photos);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const requestPermission = async () => {
    // This will trigger the permission request
    await loadPhotos();
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

  const handlePhotoTap = async (photo: Photo) => {
    // Use the thumbnail for now, but we could get full res if needed
    onPhotoSelect(`data:image/jpeg;base64,${photo.data}`);
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

      {/* Photo Grid - EXACTLY like Instagram */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading photos...</p>
          </div>
        ) : needsPermission ? (
          // Permission needed screen
          <div className="flex items-center justify-center h-full px-8">
            <div className="text-center">
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-white text-lg font-medium mb-2">
                {permissionDenied ? 'Photo Access Denied' : 'Allow Photo Access'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {permissionDenied 
                  ? 'Please enable photo access in Settings to add photos to your story'
                  : 'To add photos to your story, allow access to your photo library'}
              </p>
              {permissionDenied ? (
                <Button 
                  onClick={() => {
                    // Open settings
                    window.open('app-settings:', '_blank');
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
          <div className="grid grid-cols-3 gap-0.5">
            {/* Camera Button - Top left ONLY */}
            <button
              onClick={handleCameraCapture}
              className="aspect-square bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition"
            >
              <CameraIcon className="h-8 w-8 text-gray-400" />
            </button>
            
            {/* ACTUAL DEVICE PHOTOS - Starting from cell 2 */}
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => handlePhotoTap(photo)}
                className="aspect-square bg-gray-900 overflow-hidden hover:opacity-80 transition"
              >
                <img 
                  src={`data:image/jpeg;base64,${photo.data}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            
            {/* Fill remaining cells if needed */}
            {photos.length < 29 && (
              [...Array(29 - photos.length)].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-gray-900" />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}