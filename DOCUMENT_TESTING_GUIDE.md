# Document Management Feature - Quick Test Guide

## 🚀 Quick Start

### Prerequisites
- Python FastAPI backend running on port 8000
- React frontend running on port 5173
- Logged in to the application
- Device camera/file system access

---

## 📄 Testing the Scan Document Feature

### Step 1: Navigate to Document Hub
```
1. Click on profile menu or navigation
2. Navigate to Documents
3. See two buttons: "Scan Document" and "Upload Document"
```

### Step 2: Start Scanning
```
1. Click "Scan Document" button
2. Click "Open Camera" 
3. Allow camera permission when prompted
4. Camera grid should appear
```

### Step 3: Capture Pages
```
1. Position document in frame (use grid for alignment)
2. Click "📷 Capture Page" button
3. Page appears in "Pocket" (collection of pages)
4. Repeat for multiple pages (2-3 pages for testing)
5. See page count badge update
```

### Step 4: Preview and Save
```
1. Click "👁️ Preview & Save" button
2. All captured pages display in scrollable preview
3. Select format:
   - "📕 Save as PDF" OR
   - "🖼️ Save as Images"
4. Enter document name (e.g., "Scan Test 2025-01-15")
5. See encryption notice: "AES-256 encryption"
6. Click "💾 Save to Vault"
7. Wait for spinner (should take 2-3 seconds)
8. See success page with document details
```

### Step 5: Verify Success
```
Click "📁 Back to Hub" and verify:
- Back at document choice screen
- Can scan another document or upload file
```

---

## 📂 Testing the Upload Document Feature

### Step 1: Navigate to Document Hub
```
1. Click on profile menu or navigation
2. Navigate to Documents
3. See two buttons: "Scan Document" and "Upload Document"
```

### Step 2: Select Upload Method
```
Click "Upload Document" button
See drag-and-drop zone with message:
"Drag files here or click to browse"
```

### Step 3: Upload File
Choose ONE of three methods:

**Method A: Drag and Drop**
```
1. From your file explorer, drag a file onto the zone
2. Zone should highlight (visual feedback)
3. Drop the file
4. File appears in "Document Ready" section
```

**Method B: Click to Browse**
```
1. Click anywhere in the zone
2. File browser opens
3. Select a file
4. File appears in "Document Ready" section
```

**Method C: Test Files**
Prepare test files in these formats:
- PDF: Page 1 of any PDF (small file)
- Image: Any JPEG/PNG from your device
- Excel: Any XLSX file

### Step 4: Preview File Details
```
You should see:
- File preview (if image) or file icon
- File Name: <original filename>
- File Size: X.XX MB
- File Type: application/pdf | image/jpeg | etc.
```

### Step 5: Save to Vault
```
1. Click "👁️ Preview & Save" button
2. File preview displays
3. Enter document name (e.g., "Invoice 2025-01-15")
4. Click "💾 Save to Vault"
5. Wait for spinner
6. See success page
```

### Step 6: Verify Success
```
Success page shows:
- Document Name: <your entered name>
- Type: "Uploaded Document"
- Format: <file type>
- Pages: 1
```

---

## 🧪 Automated API Testing (cURL)

### Save Scanned Document
```bash
curl -X POST http://localhost:8000/vault/save-scanned-document \
  -F "user_id=test-user-123" \
  -F "doc_name=Test Scan Document" \
  -F "format=pdf"

# Expected Response:
{
  "ok": true,
  "vault_image_id": "uuid-here",
  "asset_id": "scan_abc1234_1234567890",
  "file_name": "Test Scan Document.pdf",
  "format": "pdf",
  "message": "Document successfully encrypted and stored"
}
```

### Upload Document File
```bash
# First, create a test file or use existing
curl -X POST http://localhost:8000/vault/upload \
  -F "file=@/path/to/your/file.pdf" \
  -F "user_id=test-user-123" \
  -F "doc_name=Test Uploaded File"

# Expected Response:
{
  "ok": true,
  "vault_image_id": "uuid-here",
  "asset_id": "doc_xyz9876_1234567890",
  "file_name": "Test Uploaded File",
  "file_size": "0.25 MB",
  "file_type": "application/pdf",
  "message": "Document successfully encrypted and stored"
}
```

### Get User Documents
```bash
curl http://localhost:8000/vault/documents/user/test-user-123

# Expected Response:
{
  "ok": true,
  "total_count": 2,
  "scanned_count": 1,
  "uploaded_count": 1,
  "documents": [
    {
      "id": "uuid",
      "user_id": "test-user-123",
      "asset_id": "scan_...",
      "file_name": "Test Scan Document.pdf",
      "document_type": "scanned_document",
      ...
    }
  ]
}
```

### Get Single Document
```bash
curl http://localhost:8000/vault/documents/{doc_id}?user_id=test-user-123

# Expected Response:
{
  "ok": true,
  "document": { ...document details... }
}
```

### Delete Document
```bash
curl -X DELETE "http://localhost:8000/vault/documents/{doc_id}?user_id=test-user-123"

# Expected Response:
{
  "ok": true,
  "message": "Document successfully deleted"
}
```

---

## ✅ Acceptance Criteria Checklist

### Frontend Functionality
- [ ] Document Hub page loads at /documents route
- [ ] Both "Scan Document" and "Upload Document" buttons visible
- [ ] Camera opens when "Scan Document" clicked
- [ ] Multiple pages can be captured and display as thumbnails
- [ ] File upload drag-drop zone accepts files
- [ ] File type/size validation works (rejects invalid files)
- [ ] Image file preview generates correctly
- [ ] Preview page shows all pages/files
- [ ] Document name input required for save
- [ ] Format selector visible for scanned documents only
- [ ] Success page displays after save
- [ ] All error messages display correctly

### Backend Functionality
- [ ] POST /vault/save-scanned-document saves to database
- [ ] POST /vault/upload saves uploaded files to database
- [ ] GET /vault/documents/user/{user_id} returns user's documents
- [ ] GET /vault/documents/{doc_id} returns document details
- [ ] DELETE /vault/documents/{doc_id} removes document
- [ ] All endpoints require user_id
- [ ] File size validation works (reject > 50MB)
- [ ] Database records have all required fields

### Data Integrity
- [ ] Document records appear in vault_images table
- [ ] document_type field set correctly (scanned_document / uploaded_document)
- [ ] encryption_enabled set to true
- [ ] asset_id generated uniquely for each document
- [ ] user_id correctly stored and matches authenticated user

### Security
- [ ] Route /documents requires authentication (ProtectedRoute)
- [ ] File uploads limited to 50MB
- [ ] File types validated against whitelist
- [ ] Users cannot delete documents they don't own
- [ ] Encryption info displayed to users

---

## 🐛 Common Issues & Solutions

### Issue: "Camera permission denied"
**Solution**: 
- Check browser console for specific error
- Check device camera settings
- Try a different browser
- Try accessing from http://localhost (some browsers require HTTPS for camera)

### Issue: "File type not supported" error
**Solution**:
- Verify file extension matches expected type
- Try a different PDF (some PDFs might have issues)
- For images, ensure JPEG/PNG/GIF/WebP format
- Check ALLOWED_TYPES in UploadDocument.tsx Component

### Issue: "Network 400/500 error" on save
**Solution**:
- Check backend console for error details
- Verify user_id is being sent
- Verify doc_name is not empty
- Check network tab in browser devtools
- Restart backend server

### Issue: "Preview not generating for image"
**Solution**:
- Check browser console for errors
- Ensure FileReader API is supported
- For large images (>10MB), preview might be slow
- Check if image format is supported

### Issue: "Document not saving to database"
**Solution**:
- Verify Supabase connection is working
- Check backend logs for SQL errors
- Verify vault_images table exists and is accessible
- Check RLS policies allow inserts

---

## 🔍 Debugging Console Commands

### Check Recent Documents (Browser Console)
```javascript
// In browser console, after logging in:
const userId = localStorage.getItem('biovault_userId');
console.log('Current User ID:', userId);

// Fetch user's documents
fetch(`/vault/documents/user/${userId}`)
  .then(r => r.json())
  .then(data => console.log('Documents:', data));
```

### Monitor Network Requests
```
1. Open DevTools (F12)
2. Go to Network tab
3. Start scan or upload
4. Click "Save to Vault"
5. Look for POST requests to /vault/save-scanned-document or /vault/upload
6. Check Request payload (Form Data section)
7. Check Response (should have "ok": true)
```

### Check Backend Logs
```bash
# In terminal running FastAPI backend:
# Look for these log messages:

# For scanning:
"✅ Scanned Document Saved: Document Name by user-id"

# For uploading:
"✅ Document Uploaded: filename.ext (X.XXMB) by user-id"

# For errors:
"❌ Save Scanned Document Error: ..."
"❌ Upload Error: ..."
```

---

## 📊 Test Scenarios

### Scenario 1: Quick Scan Test (2 minutes)
```
1. Navigate to /documents
2. Click "Scan Document"
3. Allow camera
4. Scan 1 page (take a photo of something)
5. Click "Preview & Save"
6. Enter "Quick Test"
7. Click "Save to Vault"
8. Verify success page
9. Result: ✅ Scan workflow complete
```

### Scenario 2: Multi-Page Scan (3 minutes)
```
1. Navigate to /documents
2. Click "Scan Document"
3. Scan 3 different pages
4. Verify all 3 appear as thumbnails
5. Click "Preview & Save"
6. Verify all 3 pages in preview
7. Toggle format between PDF and Images
8. Click "Save to Vault"
9. Result: ✅ Multi-page handling works
```

### Scenario 3: File Upload Test (2 minutes)
```
1. Navigate to /documents
2. Click "Upload Document"
3. Click to browse and select a PDF file
4. Verify file appears with preview/icon
5. Click "Preview & Save"
6. Enter filename
7. Click "Save to Vault"
8. Verify success page
9. Result: ✅ File upload workflow complete
```

### Scenario 4: Drag & Drop Test (2 minutes)
```
1. Navigate to /documents
2. Click "Upload Document"
3. Open file explorer in another window
4. Drag a file onto the zone
5. Zone should highlight
6. Drop file
7. Verify file appears
8. Complete save workflow
9. Result: ✅ Drag-drop functionality works
```

### Scenario 5: Error Handling Test (2 minutes)
```
1. Try uploading a file > 50MB
   Result: ✅ Size validation error displays
2. Try uploading a .exe file
   Result: ✅ Type validation error displays
3. Try saving without entering doc name
   Result: ✅ Save button disabled
4. Try canceling during upload
   Result: ✅ Back button works
```

---

## 📈 Performance Benchmarks

### Expected Performance Metrics

| Operation | Expected Time | Max Time |
|-----------|---|---|
| Camera startup | <1 sec | <3 sec |
| Page capture | <500ms | <1 sec |
| File selection | <2 sec | <5 sec |
| Preview generation | <1 sec | <3 sec |
| API save (1 page) | 2-3 sec | <5 sec |
| API save (5 pages) | 5-8 sec | <15 sec|
| File upload (5MB) | 2-4 sec | <10 sec |
| File upload (50MB) | 10-30 sec | <60 sec |

---

## 🎯 Sign-Off Criteria

Document Management Feature is **READY FOR PRODUCTION** when:

✅ All 4 React components created and integrated
✅ All 5 backend endpoints implemented
✅ Frontend builds without errors
✅ Backend starts without errors
✅ Camera scanning captures pages correctly
✅ File uploads work with validation
✅ Both paths save to vault successfully
✅ Success confirmation displays
✅ Database records created correctly
✅ Encryption metadata stored
✅ All error cases handled gracefully
✅ Mobile camera permissions tested
✅ Responsive design works on all devices
✅ No console errors or warnings

---

**Test Coverage**: ✅ Complete

**Estimated Test Time**: 30-60 minutes (comprehensive)

**Next Steps**: Integration with sharing system
