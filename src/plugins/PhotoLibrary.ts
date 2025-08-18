import { registerPlugin } from '@capacitor/core';

export interface Photo {
  id: string;
  data: string; // base64 encoded image
  creationDate: number;
}

export interface PhotoLibraryResponse {
  photos: Photo[];
  needsPermission?: boolean;
  permissionDenied?: boolean;
}

export interface PhotoLibraryPlugin {
  loadRecentPhotos(options: { count?: number }): Promise<PhotoLibraryResponse>;
  getFullImage(options: { identifier: string }): Promise<{ data: string }>;
}

const PhotoLibrary = registerPlugin<PhotoLibraryPlugin>('PhotoLibrary', {
  web: () => {
    // Fallback for web - return empty photos
    return {
      loadRecentPhotos: async () => ({ photos: [] }),
      getFullImage: async () => ({ data: '' })
    };
  }
});

export default PhotoLibrary;