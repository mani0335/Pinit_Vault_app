# End-to-End Document Management Flow

## Overview
This document describes the complete lifecycle of document management in the Secure Sweet Access application, from capture to secure storage and retrieval.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION FLOW                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Dashboard       │
│  (Protected)     │
└────────┬─────────┘
         │
         ├──► 📄 Documents Hub
         │         ↓
         │    [Upload Options]
         │    ├─ 📷 Scan Documents
         │    └─ 📤 Upload Files
         │
         ├───────────────────────┐
         │                       │
         ▼                       ▼
    ┌─────────────┐        ┌─────────────┐
    │   SCAN      │        │   UPLOAD    │
    │  FLOW       │        │   FLOW      │
    └─────────────┘        └─────────────┘
         │                        │
         ├──► 📷 Camera Input     ├──► 📁 File Selection
         │                        │
         ├──► 📸 Capture Pages    ├──► 🖼️ Image Preview
         │                        │
         └──► ✏️ Review/Edit      └──► ✏️ Review/Edit
             [Reorder/Delete]         [Rename/Select]
             [Enter PDF Name]         [Enter PDF Name]
                    │                        │
                    └─────────────┬──────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │   REVIEW PAGE           │
                    │ [Pages: 1-N selected]   │
                    └─────────────┬────────────┘
                                  │
                    ┌─────────────▼───────────────────┐
                    │  PDF GENERATION & ENCRYPTION    │
                    │  1. Generate PDF from images    │
                    │  2. Encrypt PDF with AES-256    │
                    │  3. Store encryption key        │
                    │  4. Save metadata               │
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   VAULT STORAGE          │
                    │ (localStorage/IndexedDB)  │
                    │ {                         │
                    │  id: doc_XXXXX,           │
                    │  fileName: "...",         │
                    │  fileData: encrypted,     │
                    │  encryptionKey: key,      │
                    │  createdAt: timestamp,    │
                    │  fileSize: size,          │
                    │  isEncrypted: true        │
                    │ }                         │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼──────────┐
                    │  RETURN TO DASHBOARD  │
                    └───────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │    VAULT PAGE           │
                    │ [View Documents]        │
                    │ [Download/Delete]       │
                    │ [Decrypt & Preview]     │
                    └─────────────────────────┘
```

## User Flows

### 1️⃣ Document Scanning Flow

```
Entry Point: Dashboard → Documents
            ↓
        [View Upload Options]
            ↓
        [Click: Scan Documents]
            ↓
        ScanDocumentFlow Component
            ├─ Camera Permission Request
            │   ├─ GRANTED → Enable Camera
            │   └─ DENIED → Show Error
            │
            ├─ Camera Active
            │   ├─ Grid Overlay (for document alignment)
            │   ├─ Real-time Feed
            │   └─ Capture Button
            │
            ├─ Capture Page
            │   ├─ Canvas Screenshot from Video
            │   ├─ Convert to Base64 JPEG
            │   ├─ Add to Pages Array
            │   └─ Show Page Count
            │
            ├─ Multi-Page Support
            │   ├─ Repeat: Capture Page
            │   ├─ Reposition Document
            │   ├─ Retake if needed
            │   └─ View Page Thumbnails
            │
            └─ Finish Scanning
                ├─ Stop Camera Stream
                ├─ Pass Pages [base64, base64, ...]
                └─ Transition → Review Page
```

**Component**: `src/pages/ScanDocumentFlow.tsx`
**Key Functions**:
- `startCamera()` - Request media stream
- `capturePage()` - Capture from video canvas
- `finishScanning()` - Transition with pages
- `deletePage(index)` - Remove specific page

### 2️⃣ Document Upload Flow

```
Entry Point: Dashboard → Documents
            ↓
        [View Upload Options]
            ↓
        [Click: Upload from Device]
            ↓
        UploadFromDevice Component
            ├─ File Input (Multi-select)
            │   ├─ Accept: .pdf, .jpg, .png, .docx
            │   └─ Display Selected Files
            │
            ├─ File Validation
            │   ├─ Size Check (< 50MB)
            │   ├─ Type Validation
            │   └─ Format Support Check
            │
            ├─ Image Conversion (if needed)
            │   ├─ PDF → Images
            │   ├─ DOCX → Preview Images
            │   └─ Keep as single page
            │
            └─ Review Selected Files
                ├─ Show Filenames
                ├─ Show Sizes
                └─ Proceed to Review Page
```

**Component**: `src/pages/UploadFromDevice.tsx`
**Key Functions**:
- `handleFileSelect()` - Process selected files
- `convertImageToBase64()` - Image → Base64
- `validateFileSize()` - Size validation

### 3️⃣ Review & Edit Flow

```
Entry Point: From Scan or Upload
            ↓
        ReviewPage Component [pages: string[]]
            │
            ├─ Page Gallery
            │   ├─ Grid Display (4 per row)
            │   ├─ Page Thumbnails
            │   ├─ Page Numbers (1-N)
            │   └─ Hover Actions
            │
            ├─ Page Management
            │   ├─ Delete Page
            │   │   ├─ Confirm Removal
            │   │   └─ Update Gallery
            │   │
            │   ├─ Reorder Pages
            │   │   ├─ Toggle Reorder Mode
            │   │   ├─ Move Up Button
            │   │   ├─ Move Down Button
            │   │   └─ Visual Feedback
            │   │
            │   └─ Select Page (Preview)
            │       └─ Large Preview on Right
            │
            ├─ PDF Configuration
            │   ├─ Enter PDF Name
            │   │   └─ Default: "Scanned-Document-[DATE].pdf"
            │   │
            │   └─ Compression Settings
            │       └─ Quality: 90 (default)
            │
            └─ Save to Vault
                ├─ Click: "Save PDF"
                │
                ├─ Process Pipeline:
                │   1. ⏳ Merge Images → PDF (imagesToPDF)
                │   2. 🔐 Encrypt PDF (encryptFile)
                │   3. 💾 Add to Vault (addDocumentToVault)
                │   4. 💿 Persist State (saveVaultState)
                │
                ├─ Status Messages
                │   ├─ "⏳ Generating PDF..."
                │   ├─ "🔐 Encrypting document..."
                │   ├─ "💾 Saving to vault..."
                │   └─ "✅ PDF saved to vault!"
                │
                └─ Post-Save
                    ├─ 2s Delay
                    ├─ Navigate to Dashboard/Vault
                    └─ Show Success Message
```

**Component**: `src/pages/ReviewPage.tsx`
**Key Functions**:
- `savePDF()` - Main save operation
- `deletePage(index)` - Remove page
- `movePage(fromIdx, toIdx)` - Reorder pages

### 4️⃣ Vault Storage Flow

```
Storage Locations (Priority Order):
1. localStorage - Simple key-value (for small docs)
2. IndexedDB - For larger documents (if implemented)
3. Backend API - For sync/cloud (future)

Vault Structure:
┌─────────────────────────────────────────┐
│ localStorage["biovault_documents"]      │
│ ─────────────────────────────────────── │
│ {                                       │
│   "users": {                            │
│     "[userId]": {                       │
│       "documents": [                    │
│         {                               │
│           "id": "doc_1733456789123",  │
│           "fileName": "Invoice.pdf",   │
│           "fileType": "pdf",            │
│           "fileSize": "2.45 MB",        │
│           "fileData": "[encrypted]",    │
│           "createdAt": "2024-12-05T...",│
│           "isEncrypted": true,          │
│           "encryptionKey": "[key]",     │
│           "metadata": {                 │
│             "pages": 3,                 │
│             "source": "scan",           │
│             "tags": ["important"]       │
│           }                             │
│         },                              │
│         ...                             │
│       ]                                 │
│     }                                   │
│   }                                     │
│ }                                       │
└─────────────────────────────────────────┘

Functions (vaultManager.ts):
├─ initializeVault()
│   └─ Get/Create vault structure
│
├─ addDocumentToVault(vault, document)
│   └─ Add new document to user's collection
│
├─ saveVaultState(vault)
│   └─ Persist to localStorage
│
├─ getVaultState()
│   └─ Retrieve vault from localStorage
│
├─ getDocument(vault, docId)
│   └─ Retrieve specific document
│
├─ deleteDocument(vault, docId)
│   └─ Remove document from vault
│
├─ getDocumentsBYUser(vault, userId)
│   └─ Get all user's documents
│
└─ updateDocument(vault, docId, changes)
    └─ Update document metadata
```

**File**: `src/lib/vaultManager.ts`

### 5️⃣ Encryption/Decryption Flow

```
Encryption Pipeline:
┌─────────┐
│  Text   │
│  Data   │
└────┬────┘
     │
     ├─►  AES-256 Encryption (crypto-js)
     │    ├─ Algorithm: AES-256-CBC
     │    ├─ Key: Derived from user ID/seed
     │    ├─ IV: Random generated
     │    └─ Output: Encrypted string
     │
     ├─►  Base64 Encoding
     │    └─ For storage in localStorage
     │
     └──►  Encrypted File Data
          └─ Stored as: [ENCRYPTED_KEY]
              ├─ Format: enc_[encrypted_hex]_[iv_hex]_[salt_hex]
              └─ Reversible: yes

Decryption Pipeline:
┌─────────────────────┐
│ Encrypted File Data │
└────┬────────────────┘
     │
     ├─►  Parse Structure
     │    └─ Extract enc_, IV, salt
     │
     ├─►  Base64 Decoding
     │    └─ Restore binary data
     │
     ├─►  AES-256 Decryption
     │    ├─ Use stored key
     │    ├─ Use stored IV
     │    └─ Output: Original data
     │
     └──►  Original PDF Data
          └─ Ready for preview/download

Functions (encryptionUtils.ts):
├─ encryptFile(fileData)
│   ├─ Input: Base64 file data
│   ├─ Output: { encrypted, key }
│   └─ Process: AES-256 + Base64
│
└─ decryptFile(encrypted, key)
    ├─ Input: Encrypted data + key
    ├─ Output: Original file data
    └─ Process: Reverse AES-256 + Base64
```

**File**: `src/lib/encryptionUtils.ts`

## Complete User Journey Example

### Scenario: User scans a multi-page invoice

**Step-by-Step**:

1. **Enter Document Hub**
   - Click "Documents" on Dashboard
   - See [Scan Documents] and [Upload Documents] options

2. **Start Scanning**
   - Click "📷 Scan Documents"
   - Grant camera permission
   - See camera feed with grid overlay

3. **Capture Pages**
   - Position first page of invoice
   - Click "📸 Capture Page"
   - See "✅ Page 1 captured!" message
   - Flip to next page
   - Click "📸 Capture Page" again
   - Repeat for all 3 pages
   - See thumbnail strip at bottom: [Page 1] [Page 2] [Page 3]

4. **Finish Scanning**
   - Click "✅ Done (3)"
   - Camera stops
   - Transition to Review Page

5. **Review & Edit**
   - See 3-page gallery in grid layout
   - Page 2 is slightly crooked, click to delete ❌
   - Remaining: [Page 1] [Page 3]
   - Click "🔄 Reorder"
   - Drag to reorder if needed
   - Enter PDF name: "Invoice-December-2024.pdf"
   - Click "✅ Done Reordering"

6. **Save to Vault**
   - Click "💾 Save PDF"
   - See status messages:
     - ⏳ Generating PDF... (2 pages)
     - 🔐 Encrypting document...
     - 💾 Saving to vault...
   - After 2s: ✅ PDF saved to vault! 2 pages combined.

7. **View in Vault**
   - Auto-navigate to Vault
   - See new document:
     ```
     📄 Invoice-December-2024.pdf
     Size: 2.5 MB
     Date: Dec 5, 2024
     Status: 🔒 Encrypted
     ```

8. **Manage Document**
   - Hover over document card
   - Options:
     - 👁️ Preview (decrypt and view)
     - ⬇️ Download (save to device)
     - 🔗 Share (generate share link)
     - 🗑️ Delete (remove from vault)

## Integration Points

### Frontend Components Involved:
1. **Dashboard** - Entry point
2. **DocumentHub** - Options hub
3. **ScanDocumentFlow** - Camera capture
4. **UploadFromDevice** - File upload
5. **ReviewPage** - Edit & save
6. **VaultPage** - View & manage

### Backend Services:
1. **vaultManager.ts** - Vault operations
2. **encryptionUtils.ts** - Encryption/decryption
3. **pdfGenerator.ts** - Image to PDF
4. **Backend API** - Supabase integration (if enabled)

### Data Flow:
```
User Input → Capture/Upload → Review → Encrypt → Store → Retrieve → Decrypt → Display
```

## Error Handling

### Graceful Failures:

| Scenario | Error Message | Recovery |
|----------|---------------|----------|
| Camera denied | ❌ Camera not supported. Check permissions. | Show file upload option |
| No pages scanned | ❌ No pages to save | Go back to scan |
| PDF generation fails | ❌ Error: Failed to generate PDF | Retry or delete page |
| Encryption fails | ❌ Error: Encryption failed | Retry save |
| Storage full | ❌ Storage quota exceeded | Delete old documents |
| Invalid file type | ❌ File type not supported | Select valid format |

## Performance Considerations

### Optimizations:
- **Image Compression**: JPEG 90% quality
- **PDF Compression**: Enabled by default
- **Lazy Loading**: Page thumbnails load on demand
- **Base64 Cache**: Pages kept in memory during session
- **Encryption**: Happens after PDF generation (reduces load)

### Limitations:
- localStorage max: ~5-10MB per domain
- Large documents may cause slowdown
- Camera capture limited by device capability
- PDF generation CPU intensive for 10+ pages

## Security Features

### Data Protection:
1. **Encryption at Rest**: AES-256-CBC
2. **Biometric Authentication**: Required for vault access
3. **User Isolation**: Documents per userId
4. **Secure Key Storage**: Derived from user credentials
5. **No Plaintext Storage**: All PDFs encrypted

### Future Enhancements:
1. Backend encryption key management
2. Document-level access control
3. Audit logging for document access
4. Encrypted cloud sync (Supabase)
5. Share token expiry

## Testing Scenarios

### Happy Path:
✅ Scan 3 pages → Review → Reorder → Save → View in Vault

### Edge Cases:
✅ Scan 1 page → Save immediately
✅ Scan 10 pages → Delete half → Save
✅ Upload PDF → Save to vault
✅ Low light camera feed
✅ Network unavailable (local save)

### Error Cases:
✅ Camera permission denied
✅ Large file upload rejection
✅ Storage quota exceeded
✅ Encryption key mismatch on decrypt
✅ Corrupted stored data recovery

## Deployment Checklist

- [ ] Frontend build passes (`bun run build`)
- [ ] Backend endpoints tested
- [ ] Database schema migrated (Supabase)
- [ ] Encryption keys configured
- [ ] Error boundaries implemented
- [ ] Loading states visible
- [ ] Success messages clear
- [ ] Mobile tested (camera, storage)
- [ ] Biometric flow integrated
- [ ] Analytics instrumented

## Next Steps

1. **E2E Testing**: Playwright test suite
2. **Performance**: Optimize for large documents
3. **Cloud Sync**: Backend integration
4. **Mobile**: Native camera access (Capacitor)
5. **Sharing**: Public link generation
6. **Collaboration**: Multi-user document sharing

---

**Status**: ✅ Ready for Testing
**Last Updated**: Current Session
**Version**: 1.0
