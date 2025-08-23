import Foundation
import Capacitor
import Photos
import UIKit

@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin {
    
    @objc func loadRecentPhotos(_ call: CAPPluginCall) {
        let count = call.getInt("count") ?? 50
        let offset = call.getInt("offset") ?? 0
        
        // Check current authorization status first
        let status = PHPhotoLibrary.authorizationStatus()
        
        switch status {
        case .authorized, .limited:
            // We already have permission, load photos immediately
            self.fetchPhotos(count: count, offset: offset, call: call)
        case .notDetermined:
            // First time - request permission
            PHPhotoLibrary.requestAuthorization { newStatus in
                if newStatus == .authorized || newStatus == .limited {
                    self.fetchPhotos(count: count, offset: offset, call: call)
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
    
    private func fetchPhotos(count: Int, offset: Int, call: CAPPluginCall) {
        let fetchOptions = PHFetchOptions()
        fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        
        let allPhotos = PHAsset.fetchAssets(with: .image, options: fetchOptions)
        let totalCount = allPhotos.count
        
        // Calculate the range to fetch
        let endIndex = min(offset + count, totalCount)
        
        var photos: [[String: Any]] = []
        let imageManager = PHImageManager.default()
        let targetSize = CGSize(width: 400, height: 400) // Slightly larger for better quality
        let options = PHImageRequestOptions()
        options.isSynchronous = false // Make it async for better performance
        options.deliveryMode = .opportunistic
        options.resizeMode = .fast
        
        let dispatchGroup = DispatchGroup()
        
        // Only fetch items in the requested range
        for i in offset..<endIndex {
            let asset = allPhotos.object(at: i)
            dispatchGroup.enter()
            
            imageManager.requestImage(for: asset, 
                                     targetSize: targetSize,
                                     contentMode: .aspectFill,
                                     options: options) { image, info in
                if let image = image,
                   let data = image.jpegData(compressionQuality: 0.6) {
                    let base64String = data.base64EncodedString()
                    photos.append([
                        "id": asset.localIdentifier,
                        "data": base64String,
                        "creationDate": asset.creationDate?.timeIntervalSince1970 ?? 0,
                        "index": i
                    ])
                }
                dispatchGroup.leave()
            }
        }
        
        dispatchGroup.notify(queue: DispatchQueue.main) {
            // Sort photos by index to maintain order
            photos.sort { (a, b) -> Bool in
                let indexA = a["index"] as? Int ?? 0
                let indexB = b["index"] as? Int ?? 0
                return indexA < indexB
            }
            
            // Remove index from response
            let cleanPhotos = photos.map { photo -> [String: Any] in
                var cleanPhoto = photo
                cleanPhoto.removeValue(forKey: "index")
                return cleanPhoto
            }
            
            call.resolve([
                "photos": cleanPhotos,
                "hasMore": endIndex < totalCount,
                "totalCount": totalCount
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