# PINIT Vault - Download & Gallery Management

## 📥 Image Download Feature

### **Overview**

The Download button allows users to save encrypted images from their vault directly to their device's photo gallery in a dedicated "PINIT Vault" folder.

---

## 🎯 How Download Works

### **Step-by-Step Process**

#### **1. User Clicks Download Button**

```
Vault Gallery View
    ↓
User selects image
    ↓
Clicks "Download" button (with checkmark icon)
```

#### **2. Check Permissions & Restrictions**

```typescript
if (isRestricted) {
  alert("❌ Temporary access: Download is not available. Complete registration for full access.");
  return;
}
```

- ✅ Full users (registered biometric): Can download
- ❌ Temporary users (no registration): Cannot download

#### **3. Retrieve Image Data**

The system attempts to get image data from (in order):

```
1. In-Memory Cache (fastest)
   └─ image.image_base64 or image.encrypted_data

2. Cloud Backup (if cache empty)
   └─ image.cloudinaryUrl → Fetch and convert to Base64

3. Database (fallback)
   └─ Supabase vault_images table → image_base64 column

4. Local Storage (last resort)
   └─ Browser localStorage cached copy
```

#### **4. Convert to Device-Friendly Format**

```javascript
// If fetched from cloud URL:
const response = await fetch(imageUrl);
const blob = await response.blob();
const arrayBuffer = await blob.arrayBuffer();
const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
```

#### **5. Create Device Folder (PINIT Vault)**

```typescript
// Automatic folder creation
await Filesystem.mkdir({
  path: "PINIT Vault",          // Folder name
  directory: Directory.Pictures, // Pictures directory
  recursive: true,              // Create if doesn't exist
});
```

#### **6. Save File to PINIT Vault**

```typescript
const result = await Filesystem.writeFile({
  path: `PINIT Vault/${uniqueName}`,
  data: base64Data,
  directory: Directory.Pictures,
  encoding: Encoding.UTF8,
});

// File naming: PINIT_[USER_ID_8_CHARS]_[TIMESTAMP].jpg
// Example: PINIT_abc123de_1704067200000.jpg
```

#### **7. Show Success Confirmation**

```
┌───────────────────────────────────┐
│ ✅ Image Downloaded!              │
│                                   │
│ 📁 Saved to: PINIT Vault          │
│ 📸 [filename].jpg                 │
│                                   │
│ Check your phone's gallery.       │
│                                   │
│ [OK]                              │
└───────────────────────────────────┘
```

---

## 📁 PINIT Vault Folder Structure

### **Device Paths**

#### **Android**
```
Phone Storage
├── Internal Storage
│   └── Pictures
│       └── PINIT Vault/
│           ├── PINIT_abc12345_1704067200000.jpg
│           ├── PINIT_abc12345_1704067201000.jpg
│           └── PINIT_abc12345_1704067202000.jpg
```

**Full Path**: `/sdcard/Pictures/PINIT Vault/` or `/storage/emulated/0/Pictures/PINIT Vault/`

#### **iOS**
```
Photo Library
├── Albums
│   └── PINIT Vault/
│       ├── PINIT_abc12345_1704067200000.jpg
│       ├── PINIT_abc12345_1704067201000.jpg
│       └── PINIT_abc12345_1704067202000.jpg
```

#### **Web Browser**
```
Memory Storage
└── memory://PINIT_Vault/
    ├── PINIT_abc12345_1704067200000.jpg
    └── (In-session only, not persisted)
```

---

## 📝 File Naming Convention

### **Naming Pattern**

```
PINIT_[USER_ID_SUBSTRING]_[UNIX_TIMESTAMP].jpg

Breaking it down:
├─ PINIT          → App identifier
├─ abc12345       → First 8 characters of user ID
├─ 1704067200000  → Current timestamp in milliseconds
└─ .jpg           → File format
```

### **Example Names**

| User ID | Timestamp | Result |
|---------|-----------|--------|
| `user@example.com` | `1704067200000` | `PINIT_user@ex_1704067200000.jpg` |
| `john-doe-12345` | `1704067300000` | `PINIT_john-do_1704067300000.jpg` |
| `abc123def456` | `1704067400000` | `PINIT_abc123de_1704067400000.jpg` |

### **Key Benefits**

✅ **Unique**: Timestamp ensures no file collisions  
✅ **Identifiable**: User ID helps recognize file owner  
✅ **Sortable**: Timestamp allows chronological ordering  
✅ **Safe**: No special characters that cause issues on mobile

---

## 🔄 Download Flow Diagram

```
User Clicks Download
    ↓
├─ Check: User registered? YES/NO
│   └─ NO → Show error, return
│
├─ Get User ID from storage
│   └─ Used to verify ownership & naming
│
├─ Retrieve Image Data (attempt each):
│   ├─ Try: In-memory cache
│   ├─ Try: Cloud backup (Cloudinary)
│   ├─ Try: Database (Supabase)
│   └─ Fail: Show error alert
│
├─ Create PINIT Vault Folder
│   ├─ Try: Capacitor Filesystem API
│   ├─ Fallback: Save without subfolder
│   └─ Web: Use memory storage
│
├─ Write File to Device
│   ├─ File path: Pictures/PINIT Vault/PINIT_[ID]_[TIME].jpg
│   └─ Base64 data: Encrypted image
│
└─ Show Success Alert
    └─ Confirm location: PINIT Vault
```

---

## 💾 Technical Implementation

### **Code Location**

```
src/components/PINITDashboard.tsx
├─ handleDownloadImage() function
│   └─ Called when Download button clicked
│
src/lib/vaultService.ts
├─ saveImageToGallery() function
│   └─ Handles folder creation and file saving
│
src/components/PINITVaultDashboard.tsx
├─ handleDownload() function
│   └─ Alternative download handler for vault page
```

### **Key Functions**

#### **`saveImageToGallery(base64Data, fileName, userId)`**

```typescript
/**
 * Save watermarked image to device gallery in "PINIT Vault" folder
 * Works on Android, iOS, and web
 */
export async function saveImageToGallery(
  base64Data: string,           // Image as base64
  fileName: string,              // Original filename
  userId: string                 // User who owns image
): Promise<{ 
  success: boolean; 
  path?: string;                 // Location where saved
  error?: string;                // Error message if failed
}> { /* ... */ }
```

#### **Parameters**

| Parameter | Type | Example | Purpose |
|-----------|------|---------|---------|
| `base64Data` | string | `"iVBORw0KGgoAAA..."` | Encrypted image data |
| `fileName` | string | `"vacation-photo.jpg"` | Original image name |
| `userId` | string | `"user@example.com"` | Owner identifier |

#### **Return Value**

```typescript
// Success case
{
  success: true,
  path: "/storage/emulated/0/Pictures/PINIT Vault/PINIT_user_1704067200000.jpg"
}

// Failure case
{
  success: false,
  error: "Permission denied: apps.photos not available"
}

// Web case
{
  success: true,
  path: "memory://PINIT_Vault/PINIT_user_1704067200000.jpg"
}
```

---

## ⚙️ Error Handling

### **Common Error Scenarios**

#### **1. Temporary User Trying to Download**

```
User Status: Temporary Access (no biometric registered)
    ↓
Click Download
    ↓
Check: isRestricted = true
    ↓
Alert: "❌ Temporary access: Download is not available.
        Complete registration for full access."
    ↓
Return (no download)
```

#### **2. Image Data Not Available**

```
Query multiple sources:
├─ Cache: empty
├─ Cloudinary: network error
├─ Database: connection timeout
└─ Storage: data missing
    ↓
Alert: "❌ No image data available to download"
    ↓
Return (no download)
```

#### **3. Permission Denied (Android)**

```
Request to create folder: Pictures/PINIT Vault/
    ↓
Android Permission Check:
├─ WRITE_EXTERNAL_STORAGE: DENIED
└─ MANAGE_EXTERNAL_STORAGE: DENIED
    ↓
Fallback: Save to root Pictures folder
    ↓
Alert: "⚠️ Image downloaded, saved to Pictures"
```

#### **4. Cloud Fetch Timeout**

```
User clicks Download
    ↓
Image not in cache
    ↓
Try to fetch from Cloudinary
    ↓
Request timeout after 30 seconds
    ↓
Alert: "❌ Download failed. Try again."
```

---

## 🔐 Security Considerations

### **User Verification**

```typescript
// Every download verifies ownership
const currentUserId = userId || await appStorage.getItem('biovault_userId');

if (!currentUserId) {
  alert('❌ Unable to identify user. Please login again.');
  return; // Cannot proceed without verified user
}
```

### **Data Integrity**

```typescript
// Image metadata includes checksum
metadata = {
  userId: "verified-user",
  timestamp: 1704067200000,
  fileHash: "abc123def456...",  // Integrity check
  fileSize: 2048576,
}

// Before saving, we verify this matches
if (image.metadata.ownerId !== currentUserId) {
  // Reject: image belongs to different user
}
```

### **Storage Location**

✅ **Isolated Folder**: PINIT Vault folder keeps user's encrypted images organized  
✅ **Device-Local**: Photos stored on-device, not accessible by other apps by default  
✅ **Backup Support**: Can be included in device backup routines  
✅ **Gallery Visibility**: Appears in native Photos app, backed up by iCloud/Google Photos (if enabled)

---

## 📊 Supported Formats

### **Input Formats (Encryption)**
- ✅ JPG / JPEG
- ✅ PNG
- ✅ WebP
- ✅ GIF
- ✅ HEIC (iOS)

### **Output Formats (Download)**
- ✅ JPG (preferred, smaller size)
- ✅ PNG (if original)
- ✅ Format depends on input

---

## 🧪 Testing Download Feature

### **Test Case 1: Basic Download**

```
1. Login successfully
2. Go to Vault
3. Select any encrypted image
4. Click Download button
5. Expected: Alert shows "✅ Image Downloaded!"
6. Check: Open phone gallery → PINIT Vault folder exists
7. Verify: Image file is present and viewable
```

### **Test Case 2: Download Persistence**

```
1. Download 5 images
2. Check PINIT Vault folder in gallery
3. Close app completely
4. Reopen app
5. Download 3 more images
6. Check PINIT Vault folder
7. Expected: Now 8 images total in folder
```

### **Test Case 3: Error Handling**

```
1. Login as temporary user
2. Try to download image
3. Expected: "❌ Temporary access: Download is not available"
4. Register biometric (fingerprint + face)
5. Try download again
6. Expected: Success, image saved to PINIT Vault
```

---

## 📈 Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| Create PINIT Vault folder | < 100ms | On-device, instant |
| Write file to gallery | 500ms - 2s | Depends on image size (2-10MB) |
| Show success alert | Immediate | User sees confirmation |
| Total download time | 1-3 seconds | With all steps |

---

## 🔧 Troubleshooting

### **Image Not Appearing in Gallery**

**Problem**: Downloaded image not visible in phone gallery

**Solutions**:
1. Try "Refresh" in gallery app
2. Restart phone (clears cache)
3. Check file manager directly:
   - Android: Files app → Pictures → PINIT Vault
   - iOS: Files app → On My iPhone → PINIT Vault
4. Check if storage is full
5. Verify app has storage permissions

### **Download Button Grayed Out**

**Problem**: Download button is disabled/inactive

**Solutions**:
1. Check if user is registered (not temporary access)
2. Verify image is fully encrypted
3. Check internet connection (for cloud fallback)
4. Try selecting a different image
5. Re-login and try again

### **"Permission Denied" Error**

**Problem**: Can't save to device gallery

**Solutions**:
1. Check app permissions:
   - Android: Settings → Apps → PINIT Vault → Permissions → Storage
   - iOS: Settings → PINIT Vault → Photos
2. Enable "Photos & Videos" or "All Photos" permission
3. On Android 11+: Enable "Photos and videos only" (if available)
4. Try again after granting permission

### **Image Saved But Can't View**

**Problem**: File saved by app but won't open

**Solutions**:
1. Try opening with different gallery app
2. Check if file format is supported
3. File might be corrupted - re-download
4. Verify file size is not 0 bytes

---

## 📝 Summary

The **Download Feature** provides:
- ✅ Simple one-tap download to device
- ✅ Automatic PINIT Vault folder organization
- ✅ Multi-source data retrieval (cache → cloud → db)
- ✅ Permission checking for registered users only
- ✅ Clear success/error messaging
- ✅ Secure user verification before access
- ✅ Fallback mechanisms for reliability
- ✅ Device-native gallery integration
