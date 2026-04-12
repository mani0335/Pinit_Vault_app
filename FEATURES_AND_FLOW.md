# PINIT Vault - Features and Application Flow

## 📋 Overview

PINIT Vault is a biometric-secured image encryption and vault management application. The app implements a complete authentication flow with biometric verification, image encryption with steganography, and secure storage management.

---

## 🔐 Application Flow

### **Phase 1: Initial Launch & Registration Check**

When the user opens the PINIT Vault app:

1. **Splash Screen** (2 seconds)
   - Shows "PINIT VAULT" branding
   - Initializes background services

2. **Registration Status Check**
   - App checks if user has registered biometric
   - Query: `biovault_userId` from device storage
   
   **Three Possible Paths:**
   - ✅ **User Registered**: Continue to Login
   - ❌ **User Not Registered**: Redirect to BiometricOptions page
   - ⚠️ **Storage Error**: Assume not registered, go to BiometricOptions

---

### **Phase 2: Login - Biometric Verification**

#### **Step 1: Fingerprint Verification**

When user navigates to login:

```
1. Fingerprint Scanner Opens
   ↓
2. User places finger on device scanner
   ↓
3. Local biometric scan (native OS)
   ↓
4. Send to Backend for Verification
   - Backend checks: Is this fingerprint registered for this user?
   - Query: SELECT * FROM biometric_data WHERE user_id = ? AND type = "fingerprint"
   ↓
5. Backend Response
   ├─ ✅ Verified → Continue to Step 2 (Face Verification)
   └─ ❌ Not Verified → Show error, allow retry or register new biometric
```

**Fingerprint Verification Code Flow:**
```typescript
// src/pages/Login.tsx
const handleFingerprintSuccess = async () => {
  // Get user ID from storage
  const userId = await appStorage.getItem("biovault_userId");
  
  // Verify with backend
  const result = await verifyFingerprintBackend(userId);
  
  if (result.verified) {
    // Proceed to face verification
    setVerification(prev => ({ ...prev, step: "face" }));
  } else {
    // Show error
    setVerification(prev => ({
      ...prev,
      step: "error",
      errorMessage: result.message
    }));
  }
};
```

#### **Step 2: Face Authentication**

After fingerprint verification succeeds:

```
1. Face Scanner Opens
   ↓
2. User faces device camera
   ↓
3. Face detection & embedding extraction (local ML model)
   ↓
4. Send face embedding to Backend
   - Backend compares with stored face embedding
   - Uses face recognition algorithm (cosine similarity)
   ↓
5. Backend Response
   ├─ ✅ Verified → Issue authentication tokens
   └─ ❌ Not Verified → Show error, allow retry
```

**Face Verification Code Flow:**
```typescript
// src/pages/Login.tsx
const handleFaceSuccess = async (faceData: any) => {
  const faceEmbedding = faceData?.embedding || [];
  
  // Verify with backend
  const result = await verifyFaceBackend(faceEmbedding, userId);
  
  if (result.verified) {
    // Store authentication tokens
    await appStorage.setItem('biovault_token', result.token);
    await appStorage.setItem('biovault_userId', userId);
    
    // Navigate to dashboard
    navigate("/dashboard");
  } else {
    // Show error
    setVerification(prev => ({
      ...prev,
      errorMessage: "Face not matched"
    }));
  }
};
```

#### **Step 3: Success - Dashboard Access**

Once both biometrics are verified:
- ✅ Authentication tokens stored (device storage + localStorage)
- ✅ User logged in and redirected to Dashboard
- ✅ Can now access vault and encryption features

---

### **Phase 3: Not Registered - BiometricOptions Page**

If no user is registered, user sees options:

1. **Register New Biometric** ✍️
   - Starts registration flow
   - Captures fingerprint and face
   - Stores in database with user ID

2. **Temporary Access** ⏱️
   - Quick access without full registration
   - Limited functionality (no download/share)
   - Allows testing encryption features

---

## 🎥 Image Encryption & Storage

### **Encryption Flow**

When user clicks "Encrypt & Watermark" button:

```
┌─────────────────────────────────────────┐
│      User Captures/Selects Image        │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Embed User ID via Steganography       │
│   - LSB (Least Significant Bit)         │
│   - 4 corners + center watermarking     │
│   - Timestamp, file size metadata       │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Generate "Watermarked Preview"        │
│   - Shows encrypted metadata            │
│   - Displays confirmed PINIT ID         │
│   - Ownership proof visible             │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Show "Analyze" Button (Confirmation)  │
│   User clicks Analyze to finalize       │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   🔐 IMAGE ENCRYPTED SUCCESSFULLY!      │
│   ├─ Encrypted with PINIT ID: abc123   │
│   ├─ Saved to: PINIT Vault             │
│   └─ Date: [timestamp]                  │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Multi-Layer Storage Initiated:        │
│   1. Device Gallery (PINIT Vault folder)│
│   2. Supabase Database (primary)        │
│   3. Cloudinary Cloud (backup)          │
└─────────────────────────────────────────┘
```

### **Steganography (Data Embedding)**

The encryption uses **Advanced LSB Steganography**:

```javascript
// src/lib/advancedSteganography.ts
type AdvancedWatermarkMetadata = {
  userId: string;           // User who encrypted image
  timestamp: number;        // When encrypted (milliseconds)
  fileSize: number;         // Original file size
  fileHash: string;         // File integrity check
  checksum: string;         // Metadata checksum
  watermarkRegions: {       // Multi-region watermarking
    topLeft: boolean;
    topRight: boolean;
    bottomLeft: boolean;
    bottomRight: boolean;
    center: boolean;
  };
};
```

---

## 📁 PINIT Vault Folder

### **Automatic Folder Creation**

When images are downloaded or encrypted:

1. **Folder Creation** (Automatic)
   ```
   Device Storage
   ├── Pictures
   │   ├── PINIT Vault/          ← Automatically created
   │   │   ├── PINIT_abc12345_1234567890.jpg
   │   │   ├── PINIT_abc12345_1234567891.jpg
   │   │   └── PINIT_abc12345_1234567892.jpg
   │   └── (Other pictures)
   ```

2. **Folder Path** (Device Specific)
   - **Android**: `/sdcard/Pictures/PINIT Vault/`
   - **iOS**: `Photos/PINIT Vault/`
   - **Web**: `memory://PINIT_Vault/`

### **Naming Convention**

Files saved to PINIT Vault follow the pattern:
```
PINIT_[USER_ID_FIRST_8_CHARS]_[TIMESTAMP].jpg

Example: PINIT_abc123de_1704067200000.jpg
```

---

## ⬇️ Download Feature

### **Download Button Behavior**

When user clicks "Download" on a vault image:

```
┌─────────────────────────────────────────┐
│      User Clicks Download Button        │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   1. Retrieve Image Data                │
│   └─ Check multiple sources:            │
│      ├─ In-memory cache                 │
│      ├─ Cloudinary backup               │
│      └─ Supabase database               │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   2. Convert to Base64 (if needed)      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   3. Call saveImageToGallery()          │
│   └─ Parameters:                        │
│      ├─ base64Data                      │
│      ├─ fileName                        │
│      └─ userId                          │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   4. Create Device Folder               │
│   └─ Path: Pictures/PINIT Vault/        │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   5. Write File to Device               │
│   └─ File: PINIT_[ID]_[TIMESTAMP].jpg   │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   6. Success Alert Shown                │
│   ✅ Image Downloaded!                  │
│   📁 Saved to: PINIT Vault              │
│   📸 [filename]                         │
│   Check your phone's gallery            │
└─────────────────────────────────────────┘
```

---

## 🔐 Analyze Button - Encryption Confirmation

### **Behavior**

The "Analyze" button in the Encrypt Preview page serves as a **confirmation and finalization** button.

**Key Features:**
1. ✅ Only enabled AFTER encryption is complete
2. ✅ Shows watermarked preview with embedded PINIT ID
3. ✅ Clicking triggers:
   - Final encryption validation
   - Multi-layer storage save
   - "Image Encrypted Successfully" popup

### **Encryption Confirmation Flow**

```typescript
// src/components/PINITVaultDashboard.tsx (EncryptPreviewPage)

const handleSave = async () => {
  if (!encryptedData) return; // Disabled if not encrypted
  
  try {
    setIsProcessing(true);
    
    // Call onSaveToVault with encrypted package
    await onSaveToVault(encryptedData);
    
    // Success handler shows confirmation popup:
    // ✅ Image Encrypted Successfully!
    // 🔐 Encrypted with PINIT ID: abc123de...
    // 📁 Saved to: PINIT Vault
  } catch (error) {
    // Error handler shows failure message
    alert(`❌ Failed to encrypt image: ${error}`);
  }
};
```

### **Confirmation Popup Message**

When user clicks "Analyze" (after encryption succeeds):

```
┌─────────────────────────────────────────┐
│  ✅ Image Encrypted Successfully!       │
│                                         │
│  🔐 Encrypted with PINIT ID:           │
│     abc123de...                        │
│                                         │
│  📁 Saved to: PINIT Vault              │
│                                         │
│  [OK Button]                            │
└─────────────────────────────────────────┘
```

### **Encryption Validation**

The system confirms:
- ✅ User ID properly embedded in image pixels
- ✅ Watermark data correctly stored
- ✅ File saved to PINIT Vault folder
- ✅ Database record created with metadata
- ✅ Cloudinary backup uploaded (if available)

---

## 📊 Data Storage Architecture

### **Three-Layer Storage System**

```
                    User Encrypted Image
                           ↓
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
    Device Gallery    Database          Cloud Backup
   (PINIT Vault)   (Supabase)        (Cloudinary)
          ↓                ↓                ↓
   Pictures/         vault_images     Encrypted CDN
   PINIT Vault/      Table            Storage
          ↓                ↓                ↓
   PINIT_[ID]_    user_id (FK)       image_url
   [TIME].jpg      original_name      thumbnail_url
                   image_base64       file_hash
                   metadata           watermark_data
```

### **Storage Locations**

| Layer | Location | Primary Use | Fallback |
|-------|----------|-----------|----------|
| **Device** | `Pictures/PINIT Vault/` | Immediate access | None (local only) |
| **Database** | Supabase `vault_images` | Persistence across logins | Local cache |
| **Cloud** | Cloudinary | Cross-device backup | Database fallback |

---

## 🔄 Data Persistence

### **Logout and Login Cycle**

```
┌─────────────────┐
│  User Logs Out  │
├─────────────────┤
│ ✅ Tokens cleared│
│ ✅ Session ended│
│ ❌ Vault data   │
│    NOT cleared  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  User Logs In   │
├─────────────────┤
│ ✅ Fingerprint  │
│    verified     │
│ ✅ Face verified│
│ ✅ New tokens   │
│    issued       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Dashboard Load │
├─────────────────┤
│ 🔍 Query DB:    │
│ SELECT * FROM   │
│ vault_images    │
│ WHERE user_id   │
│ = [logged-in]   │
└────────┬────────┘
         ↓
┌─────────────────────┐
│ ✅ All encrypted    │
│    images appear!   │
│                     │
│ 20 images available │
│ (same as before     │
│  logout)            │
└─────────────────────┘
```

### **Data Ownership Verification**

Every action checks:
```typescript
// User can only access images with matching user_id
metadata.ownerId === currentUserId

// All vault queries use:
SELECT * FROM vault_images WHERE user_id = ?

// All downloads check:
if (image.metadata.ownerId !== userId) {
  // Reject access
}
```

---

## 🛡️ Security Features

### **1. Biometric Authentication**
- Fingerprint verification (device native biometric)
- Face recognition with ML embeddings
- Backend validation for both modalities

### **2. Steganography**
- LSB (Least Significant Bit) embedding
- Multi-region watermarking (5 regions per image)
- Timestamp and file hash for integrity

### **3. User Scoping**
- All images linked to `user_id`
- Automatic filtering by owner
- Logout doesn't delete vault data (privacy preserved)

### **4. Encryption Pipeline**
```
Original Image
    ↓
Embed User ID + Metadata (LSB)
    ↓
Generate Watermarked Preview
    ↓
Encrypt with Steganography
    ↓
Save to 3 locations simultaneously
    ↓
Verification: Can extract User ID from pixels
```

---

## 📱 User Actions & Expected Results

### **Scenario 1: Upload, Encrypt, Download**

```
1. Open App → Login (biometric)
2. Take Photo / Select Image
3. Click "Encrypt & Watermark"
   → See watermarked preview
   → PINIT ID displayed
4. Click "Analyze" (Confirm)
   → ✅ Image Encrypted Successfully!
   → Image saved to PINIT Vault
5. Go to Vault Tab
   → Image appears in gallery
6. Click Download
   → Image saved to PINIT Vault folder
   → Alert: "Image Downloaded! 📁 Saved to: PINIT Vault"
```

### **Scenario 2: Logout & Login - Data Persistence**

```
1. Encrypt 20 images (all in PINIT Vault)
2. Click Logout
   → Tokens cleared
   → Vault data remains in database
3. Lock phone / Close app
4. Reopen app → Click Login
5. Fingerprint + Face verification
6. Dashboard loads
   → ✅ All 20 images reappear!
   → No data loss
   → Same watermarked previews
```

### **Scenario 3: Temporary Access (No Registration)**

```
1. Open App → Not Registered
2. Click "Temp Access" button
3. Quick face authentication
4. Restricted Dashboard Access
   → Can: View, encrypt, analyze
   → Cannot: Download, share, delete
5. Close app → Access ends
```

---

## 🔧 Technical Implementation

### **Key Files**

| File | Purpose |
|------|---------|
| `src/pages/Login.tsx` | Biometric login flow |
| `src/pages/BiometricOptions.tsx` | Registration choices |
| `src/components/FingerprintScanner.tsx` | Fingerprint UI & logic |
| `src/components/FaceScanner.tsx` | Face authentication UI |
| `src/components/PINITVaultDashboard.tsx` | Vault & encryption |
| `src/lib/vaultService.ts` | Storage operations |
| `src/lib/advancedSteganography.ts` | Watermarking & embedding |

### **Environment Variables**

```bash
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_CLOUDINARY_NAME=your-cloudinary
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_KEY=your-supabase-key
```

---

## 📝 Summary

**PINIT Vault** provides:
- ✅ Biometric security (fingerprint + face)
- ✅ Image encryption with steganography
- ✅ Multi-layer storage (device + database + cloud)
- ✅ Automatic PINIT Vault folder management
- ✅ Download-to-gallery functionality
- ✅ Data persistence across sessions
- ✅ Ownership verification via embedded PINIT ID
- ✅ Clear encryption confirmation via "Image Encrypted Successfully" popup
