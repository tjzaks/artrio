import Foundation
import Capacitor
import Photos
import UIKit

@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin {
    
    @objc func loadRecentPhotos(_ call: CAPPluginCall) {
        let count = call.getInt("count") ?? 50
        
        // Check current authorization status first
        let status = PHPhotoLibrary.authorizationStatus()
        
        switch status {
        case .authorized, .limited:
            // We already have permission, load photos immediately
            self.fetchPhotos(count: count, call: call)
        case .notDetermined:
            // First time - request permission
            PHPhotoLibrary.requestAuthorization { newStatus in
                if newStatus == .authorized || newStatus == .limited {
                    self.fetchPhotos(count: count, call: call)
                } else {
                    call.resolve([
                        "photos": [],
                        "needsPermission": true
                    ])
                }
            }
        default:
            // Permission denied or restricted
            call.resolve([
                "photos": [],
                "needsPermission": true,
                "permissionDenied": true
            ])
        }
    }
    
    private func fetchPhotos(count: Int, call: CAPPluginCall) {
        let fetchOptions = PHFetchOptions()
        fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        fetchOptions.fetchLimit = count
        
        let fetchResult = PHAsset.fetchAssets(with: .image, options: fetchOptions)
        
        var photos: [[String: Any]] = []
        let imageManager = PHImageManager.default()
        let targetSize = CGSize(width: 300, height: 300)
        let options = PHImageRequestOptions()
        options.isSynchronous = true
        options.deliveryMode = .fastFormat
        options.resizeMode = .fast
        
        fetchResult.enumerateObjects { asset, index, _ in
            imageManager.requestImage(for: asset, 
                                     targetSize: targetSize,
                                     contentMode: .aspectFill,
                                     options: options) { image, _ in
                if let image = image,
                   let data = image.jpegData(compressionQuality: 0.7) {
                    let base64String = data.base64EncodedString()
                    photos.append([
                        "id": asset.localIdentifier,
                        "data": base64String,
                        "creationDate": asset.creationDate?.timeIntervalSince1970 ?? 0
                    ])
                }
            }
        }
        
        DispatchQueue.main.async {
            call.resolve([
                "photos": photos
            ])
        }
    }
    
    @objc func getFullImage(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else {
            call.reject("Missing identifier")
            return
        }
        
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil)
        guard let asset = fetchResult.firstObject else {
            call.reject("Asset not found")
            return
        }
        
        let imageManager = PHImageManager.default()
        let options = PHImageRequestOptions()
        options.deliveryMode = .highQualityFormat
        options.isSynchronous = true
        
        imageManager.requestImage(for: asset,
                                 targetSize: PHImageManagerMaximumSize,
                                 contentMode: .aspectFit,
                                 options: options) { image, _ in
            if let image = image,
               let data = image.jpegData(compressionQuality: 0.9) {
                let base64String = data.base64EncodedString()
                call.resolve([
                    "data": base64String
                ])
            } else {
                call.reject("Failed to get image")
            }
        }
    }
}