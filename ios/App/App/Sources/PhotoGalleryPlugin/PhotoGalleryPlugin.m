#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(PhotoGalleryPlugin, "PhotoGalleryPlugin",
    CAP_PLUGIN_METHOD(getRecentPhotos, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestPermissions, CAPPluginReturnPromise);
)