import Foundation
import Capacitor
import Photos
import UIKit

@objc(PhotoGalleryPlugin)
public class PhotoGalleryPlugin: CAPPlugin {
    
    @objc func getRecentPhotos(_ call: CAPPluginCall) {
        let limit = call.getInt("limit") ?? 30
        let thumbnailSize = call.getInt("thumbnailSize") ?? 300
        
        // Check photo library permission
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        
        if status != .authorized {
            call.reject("Photo library access not authorized")
            return
        }
        
        // Fetch recent photos
        let fetchOptions = PHFetchOptions()
        fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        fetchOptions.fetchLimit = limit
        
        let assets = PHAsset.fetchAssets(with: .image, options: fetchOptions)
        
        var photoData: [[String: Any]] = []
        let group = DispatchGroup()
        let imageManager = PHImageManager.default()
        
        let size = CGSize(width: thumbnailSize, height: thumbnailSize)
        let options = PHImageRequestOptions()
        options.deliveryMode = .highQualityFormat
        options.isNetworkAccessAllowed = true
        options.isSynchronous = false
        
        assets.enumerateObjects { (asset, index, stop) in
            group.enter()
            
            imageManager.requestImage(for: asset, targetSize: size, contentMode: .aspectFill, options: options) { (image, info) in
                defer { group.leave() }
                
                guard let image = image else { return }
                
                // Convert to base64 data URL
                if let imageData = image.jpegData(compressionQuality: 0.8) {
                    let base64String = imageData.base64EncodedString()
                    let dataURL = "data:image/jpeg;base64,\(base64String)"
                    
                    let photoInfo: [String: Any] = [
                        "identifier": asset.localIdentifier,
                        "dataURL": dataURL,
                        "width": Int(asset.pixelWidth),
                        "height": Int(asset.pixelHeight),
                        "creationDate": asset.creationDate?.timeIntervalSince1970 ?? 0
                    ]
                    
                    photoData.append(photoInfo)
                }
            }
        }
        
        group.notify(queue: .main) {
            // Sort by creation date (newest first)
            let sortedPhotos = photoData.sorted { (a, b) -> Bool in
                let dateA = a["creationDate"] as? TimeInterval ?? 0
                let dateB = b["creationDate"] as? TimeInterval ?? 0
                return dateA > dateB
            }
            
            call.resolve([
                "photos": sortedPhotos,
                "count": sortedPhotos.count
            ])
        }
    }
    
    @objc func requestPermissions(_ call: CAPPluginCall) {
        PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    call.resolve(["status": "granted"])
                case .limited:
                    call.resolve(["status": "limited"])
                case .denied, .restricted:
                    call.resolve(["status": "denied"])
                case .notDetermined:
                    call.resolve(["status": "prompt"])
                @unknown default:
                    call.resolve(["status": "denied"])
                }
            }
        }
    }
}