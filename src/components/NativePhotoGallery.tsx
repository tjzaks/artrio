import { useState, useEffect } from 'react';
import { Media } from '@capacitor-community/media';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { 
  X, ChevronDown, Camera as CameraIcon, Grid3x3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NativePhotoGalleryProps {
  onPhotoSelect: (photo: string) => void;
  onCameraCapture: () => void;
  onClose: () => void;
}

interface MediaAsset {
  identifier: string;
  data?: string;
  creationDate?: Date;
  duration?: number;
  fullWidth?: number;
  fullHeight?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export default function NativePhotoGallery({ onPhotoSelect, onCameraCapture, onClose }: NativePhotoGalleryProps) {
  const [photos, setPhotos] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      // Skip auto-loading photos due to plugin issues
      // loadPhotos();
      setLoading(false);
      setHasPermission(true);
    }
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      console.log('Starting photo load...');
      
      // Check if plugin is available
      if (!Media || !Media.getMedias) {
        console.log('Media plugin not available, using fallback');
        throw new Error('Media plugin not available');
      }
      
      // Request permissions first
      const permissionStatus = await Media.checkPermissions();
      console.log('Permission status:', permissionStatus);
      
      if (permissionStatus.publicStorage === 'granted' || permissionStatus.publicStorage === 'limited') {
        setHasPermission(true);
        
        try {
          // Try to get photos directly without album filtering first
          const media = await Media.getMedias({
            quantity: 50,
            thumbnailWidth: 256,
            thumbnailHeight: 256,
            thumbnailQuality: 75,
            types: 'photos'
          });
          
          console.log('Loaded photos directly:', media.medias?.length || 0);
          if (media.medias && media.medias.length > 0) {
            setPhotos(media.medias);
            return;
          }
        } catch (directError) {
          console.log('Direct media fetch failed, trying with albums:', directError);
        }
        
        // If direct fetch fails, try with albums
        try {
          const albums = await Media.getAlbums();
          console.log('Available albums:', albums);
          
          if (albums.albums && albums.albums.length > 0) {
            // Try the first album
            const firstAlbum = albums.albums[0];
            const media = await Media.getMedias({
              quantity: 50,
              thumbnailWidth: 256,
              thumbnailHeight: 256,
              thumbnailQuality: 75,
              types: 'photos',
              albumIdentifier: firstAlbum.identifier
            });
            
            console.log('Loaded photos from album:', media.medias?.length || 0);
            setPhotos(media.medias || []);
          }
        } catch (albumError) {
          console.log('Album fetch failed:', albumError);
          throw albumError;
        }
      } else {
        // Request permissions
        console.log('Requesting permissions...');
        const newPermissions = await Media.requestPermissions();
        console.log('New permissions:', newPermissions);
        
        if (newPermissions.publicStorage === 'granted' || newPermissions.publicStorage === 'limited') {
          loadPhotos(); // Retry after permission granted
        } else {
          setHasPermission(false);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error loading photos - falling back:', error);
      setLoading(false);
      // Don't auto-fallback, let user trigger it
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const fallbackToSystemPicker = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      
      if (image.dataUrl) {
        onPhotoSelect(image.dataUrl);
      }
    } catch (error) {
      console.error('Fallback picker error:', error);
    }
  };

  const handlePhotoTap = async (photo: MediaAsset) => {
    try {
      // Get the full quality image path
      const paths = await Media.getMediaByIdentifier({
        identifiers: [photo.identifier]
      });
      
      if (paths && paths[0]?.path) {
        // Convert path to data URL for display
        const response = await fetch(paths[0].path);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          onPhotoSelect(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } else if (photo.data) {
        // Use thumbnail if available
        onPhotoSelect(`data:image/jpeg;base64,${photo.data}`);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      // Try to use the thumbnail
      if (photo.data) {
        onPhotoSelect(`data:image/jpeg;base64,${photo.data}`);
      }
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
        
        <h2 className="text-white font-semibold">Add to story</h2>
        
        <div className="w-10" />
      </div>

      {/* Add yours button */}
      <div className="px-4 mb-4">
        <button 
          onClick={onCameraCapture}
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

      {/* Photo Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400 mb-4">Loading photos...</p>
              <p className="text-gray-500 text-sm">This may take a moment</p>
            </div>
          </div>
        ) : !hasPermission ? (
          <div className="text-center py-8 px-4">
            <p className="text-gray-400 mb-4">Photo access required</p>
            <Button onClick={loadPhotos} variant="secondary" className="mb-2">
              Grant Access
            </Button>
            <p className="text-gray-500 text-xs">or</p>
            <Button onClick={fallbackToSystemPicker} variant="ghost" size="sm" className="mt-2">
              Use System Picker
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {/* Camera Button */}
            <button
              onClick={onCameraCapture}
              className="aspect-square bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition"
            >
              <CameraIcon className="h-8 w-8 text-gray-400" />
            </button>
            
            {/* System Picker Button - Always show as second option */}
            <button
              onClick={fallbackToSystemPicker}
              className="aspect-square bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition flex items-center justify-center"
            >
              <div className="text-center">
                <div className="text-3xl mb-1">📷</div>
                <p className="text-white font-medium text-xs">Library</p>
              </div>
            </button>
            
            {/* Photo thumbnails */}
            {photos.map((photo, index) => (
              <button
                key={photo.identifier || index}
                onClick={() => handlePhotoTap(photo)}
                className="aspect-square bg-gray-900 overflow-hidden hover:opacity-80 transition"
              >
                {photo.data ? (
                  <img 
                    src={`data:image/jpeg;base64,${photo.data}`} 
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800" />
                )}
              </button>
            ))}
            
            {/* If no photos loaded, fill with empty cells */}
            {photos.length === 0 && (
              <>
                {[...Array(25)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-900" />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}