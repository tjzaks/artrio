#import <Capacitor/Capacitor.h>

CAP_PLUGIN(PhotoLibraryPlugin, "PhotoLibrary",
    CAP_PLUGIN_METHOD(loadRecentPhotos, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getFullImage, CAPPluginReturnPromise);
)