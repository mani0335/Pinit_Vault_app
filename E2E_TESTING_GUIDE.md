# Document Management E2E Testing Guide

## Quick Start

### Prerequisites
```bash
# 1. Install dependencies
bun install

# 2. Install Playwright browsers
bunx playwright install

# 3. Start dev server
bun run dev

# 4. In another terminal, run tests
# For all tests:
bunx playwright test e2e/document-flow.spec.ts

# For specific test:
bunx playwright test -g "complete document scanning"

# With UI mode (interactive):
bunx playwright test --ui

# With debug mode:
bunx playwright test --debug
```

### Run Tests
```bash
# All E2E tests
bun run test:e2e

# Only document flow tests
bunx playwright test e2e/document-flow.spec.ts

# Watch mode (if configured)
bun run test:watch

# Generate test report
bunx playwright show-report
```

---

## Manual Testing Checklist

### Test Environment Setup

- [ ] Node.js 18+ installed
- [ ] Project dependencies installed (`bun install`)
- [ ] Vite dev server running on `http://localhost:5173`
- [ ] Browser DevTools open (F12) for inspection
- [ ] Camera/microphone connected (for manual camera testing)
- [ ] localStorage enabled
- [ ] Pop-ups and notifications allowed

---

## Test Scenarios

### 1️⃣ Authentication Flow

#### Test 1.1: Login with Valid Credentials
**Steps:**
1. Navigate to `http://localhost:5173/login`
2. Enter valid email and password
3. Click "Sign In" button

**Expected Results:**
- ✅ Login form validates input
- ✅ Success message appears
- ✅ Redirects to `/dashboard`
- ✅ Auth token stored in localStorage

**Error Recovery:**
- If stuck on login: Clear localStorage and retry
- If form not validating: Check browser console for errors

---

#### Test 1.2: Login with Invalid Credentials
**Steps:**
1. Navigate to login page
2. Enter invalid email/password
3. Click "Sign In"

**Expected Results:**
- ✅ Error message displays
- ✅ Remains on login page
- ✅ No auth token stored

---

#### Test 1.3: Protected Route Access
**Steps:**
1. Clear localStorage
2. Navigate to `http://localhost:5173/dashboard`

**Expected Results:**
- ✅ Redirects to login page
- ✅ Cannot access protected routes without auth

---

### 2️⃣ Document Hub Navigation

#### Test 2.1: Access Document Hub from Dashboard
**Steps:**
1. Log in successfully
2. On dashboard, locate "Documents" link/button
3. Click it

**Expected Results:**
- ✅ Navigates to `/documents`
- ✅ Displays upload options:
  - 📷 Scan Documents
  - 📤 Upload from Device
- ✅ Back button visible

**Debug Info:**
- Check network tab for API calls
- Verify component renders: DocumentHub.tsx

---

#### Test 2.2: Return to Dashboard
**Steps:**
1. On document hub page
2. Click back button or "←" navigation

**Expected Results:**
- ✅ Returns to dashboard
- ✅ Previous state preserved

---

### 3️⃣ Document Scanning Flow

#### Test 3.1: Initialize Camera (Real Device)
**Pre-conditions:** Camera connected and enabled

**Steps:**
1. On Documents page, click "📷 Scan Documents"
2. Grant camera permission when prompted
3. Click "📷 Open Camera"

**Expected Results:**
- ✅ Camera permission dialog appears
- ✅ After grant, camera feed displays
- ✅ Grid overlay visible (rule of thirds)
- ✅ Status indicator shows "✅ Camera ready"
- ✅ No console errors

**Manual Verification:**
- [ ] Camera feed is clear and properly oriented
- [ ] Grid helps with document alignment
- [ ] Activity light shows camera is active

---

#### Test 3.2: Capture Single Page
**Steps:**
1. With camera active, position document in frame
2. Click "📸 Capture Page"
3. See success message

**Expected Results:**
- ✅ "✅ Page 1 captured!" message displays
- ✅ Page count in header updates to "1"
- ✅ Thumbnail appears in preview section
- ✅ Can proceed to capture next page

**Troubleshooting:**
- Dark image? Check lighting
- Blurry? Reduce motion or distance
- No thumbnail? Check browser console

---

#### Test 3.3: Capture Multiple Pages (3+)
**Steps:**
1. With camera active, position first page
2. Click "📸 Capture Page"
3. Reposition for next page
4. Click "📸 Capture Page" again
5. Repeat for total of 3 pages

**Expected Results:**
- ✅ "✅ Page X captured!" message for each
- ✅ Page count updates: 1 → 2 → 3
- ✅ Thumbnails shown in row below
- ✅ Each thumbnail numbered (1, 2, 3)
- ✅ Status: "Ready for next page"

**Verification in DevTools:**
```javascript
// Check pages array
console.log(document.querySelector('[class*="pages"]'));
```

---

#### Test 3.4: Delete Page from Thumbnail
**Steps:**
1. Have 3+ pages captured
2. Hover over a page thumbnail
3. Click trash/delete icon (🗑️)

**Expected Results:**
- ✅ Page disappears from thumbnails
- ✅ Page count decreases
- ✅ Remaining pages renumbered
- ✅ No console errors

**Verification:**
- [ ] Page 3 deleted → only 2 remain
- [ ] Pages still correctly ordered
- [ ] Refresh button doesn't restore deleted pages

---

#### Test 3.5: Finish Scanning
**Steps:**
1. Captured 2-3 pages
2. Click "✅ Done (3)" button

**Expected Results:**
- ✅ Camera stops (video freezes)
- ✅ Smooth transition to Review Page
- ✅ All captured pages visible in review gallery
- ✅ URL changes to review step

**Check in Console:**
```javascript
// Should see log message
"📄 Scanned 3 pages"
```

---

#### Test 3.6: Camera Permission Denied
**Steps:**
1. Click "📷 Open Camera"
2. When prompted, click "Block" (deny permission)

**Expected Results:**
- ✅ Error message: "❌ Camera not supported. Check permissions."
- ✅ Camera doesn't activate
- ✅ Can retry or go back

**Recovery:**
- In browser settings, reset permissions
- Reload page and try again

---

#### Test 3.7: Switch Camera (Dual Camera Device)
**Steps:**
1. With camera active, look for "🔄 Restart" button
2. Click it

**Expected Results:**
- ✅ Camera stream restarts
- ✅ Can reposition document
- ✅ Ready to capture again

---

### 4️⃣ Page Review & Editing

#### Test 4.1: View Page Gallery
**Pre-conditions:** Have scanned 3 pages

**Steps:**
1. After clicking "Done", arrive at Review Page
2. Observe page gallery

**Expected Results:**
- ✅ Title: "👀 Review Pages (3)"
- ✅ Pages displayed in 4-column grid
- ✅ Each page thumbnail shows page number (1, 2, 3)
- ✅ Page count matches pages captured
- ✅ Images are clearly visible

**Responsive Design Check:**
- [ ] Desktop: 4 columns
- [ ] Tablet: 3 columns
- [ ] Mobile: 2 columns

---

#### Test 4.2: Select Page for Preview
**Steps:**
1. In page gallery, click on a page thumbnail
2. Observe page selection

**Expected Results:**
- ✅ Selected page highlighted (border change)
- ✅ Large preview appears (if preview section exists)
- ✅ Click again to deselect

---

#### Test 4.3: Delete Page from Review
**Steps:**
1. In review gallery, hover over a page
2. Click delete button (if visible)

**Expected Results:**
- ✅ Page removed from gallery
- ✅ Page count decreases
- ✅ Gallery reflows (pages shift)
- ✅ Success feedback shown

---

#### Test 4.4: Reorder Pages
**Steps:**
1. Click "🔄 Reorder" button
2. Click "⬆️ Up" on page 2

**Expected Results:**
- ✅ Page 2 moves to position 1
- ✅ Visual feedback (animation)
- ✅ Page 3 becomes new page 2
- ✅ "✅ Done Reordering" button becomes active

**Reorder Sequence:**
- [ ] Move page 3 to position 1 (should have effect)
- [ ] Move page 1 down to position 3
- [ ] Click "Done Reordering"
- [ ] Pages stay in new order

---

#### Test 4.5: Enter PDF Name
**Steps:**
1. Locate PDF name input field
2. Clear default name
3. Enter "Monthly-Invoice-Dec2024.pdf"

**Expected Results:**
- ✅ Input accepts text
- ✅ Name persists until save
- ✅ Special characters allowed: -, _, (not / \ : * ? " < > |)
- ✅ Default format: "Scanned-Document-[DATE].pdf"

**Edge Cases:**
- [ ] Empty name → should use default
- [ ] Very long name (100+ chars) → truncated gracefully
- [ ] Special characters → reject or sanitize

---

### 5️⃣ PDF Generation & Encryption

#### Test 5.1: Save PDF (Happy Path)
**Steps:**
1. Have 2-3 pages reviewed
2. Enter PDF name: "Test Document.pdf"
3. Click "💾 Save PDF"

**Expected Results:**
- ✅ Status message: "⏳ Generating PDF..."
- ✅ Progress message: "🔐 Encrypting document..."
- ✅ Status message: "💾 Saving to vault..."
- ✅ Success message: "✅ PDF saved to vault! 2 pages combined."
- ✅ After 2 seconds, navigates to vault/dashboard

**Console Logs:**
```
✅ Document saved: {
  id: "doc_1733456789123",
  fileName: "Test Document.pdf",
  encrypted: true,
  size: "2.45 MB"
}
```

---

#### Test 5.2: Save with No Pages
**Steps:**
1. Delete all pages from gallery
2. Try to click "Save PDF"

**Expected Results:**
- ✅ "Save PDF" button disabled or click has no effect
- ✅ Error message: "❌ No pages to save"
- ✅ Cannot proceed

---

#### Test 5.3: Verify Encryption in Storage
**Steps:**
1. Save a PDF as in Test 5.1
2. Open DevTools (F12)
3. Go to Application → LocalStorage
4. View `biovault_documents` key

**Expected:**
```javascript
// Should see structure like:
{
  "users": {
    "test_user_123": {
      "documents": [
        {
          "id": "doc_1733456789123",
          "fileName": "Test Document.pdf",
          "fileType": "pdf",
          "fileSize": "2.45 MB",
          "fileData": "enc_[very_long_encrypted_string]",
          "encryptionKey": "key_[derived_key]",
          "createdAt": "2024-12-05T10:30:00.000Z",
          "isEncrypted": true
        }
      ]
    }
  }
}
```

**Verification:**
- [ ] `fileData` starts with "enc_"
- [ ] `encryptionKey` is present
- [ ] `isEncrypted` is `true`
- [ ] `createdAt` is ISO timestamp
- [ ] `fileSize` is formatted correctly

---

#### Test 5.4: Verify Encryption Key Randomness
**Steps:**
1. Save PDF #1 (Page A)
2. Save PDF #2 (Page A again, same content)
3. Compare in localStorage

**Expected:**
- ✅ Both have different `encryptionKey` values
- ✅ Both have different `fileData` (due to different IVs)
- ✅ Even same content produces different ciphertext

---

### 6️⃣ Vault Storage & Persistence

#### Test 6.1: Documents Persist After Reload
**Steps:**
1. Save a document (Test 5.1)
2. Press F5 or reload page
3. Verify document still in localStorage

**Expected Results:**
- ✅ localStorage retains `biovault_documents`
- ✅ Document object still present with same ID

**DevTools Check:**
```javascript
// In Console:
JSON.parse(localStorage.getItem('biovault_documents')).users['test_user_123'].documents[0].id
// Should return: "doc_1733456789123"
```

---

#### Test 6.2: Multiple Documents Isolation
**Steps:**
1. Switch auth to User A
2. Save document "Doc-A.pdf"
3. Switch auth to User B (change userId in localStorage)
4. Verify User A's doc not visible to User B

**Expected Results:**
- ✅ Each user has separate documents array
- ✅ Document IDs different per user
- ✅ No cross-user visibility

**DevTools Verification:**
```javascript
const vault = JSON.parse(localStorage.getItem('biovault_documents'));
vault.users.user_a_id.documents !== vault.users.user_b_id.documents
```

---

#### Test 6.3: Document Search by ID
**Steps:**
1. Save multiple documents
2. In DevTools, retrieve specific doc:

**Code:**
```javascript
const userId = localStorage.getItem('biovault_userId');
const vault = JSON.parse(localStorage.getItem('biovault_documents'));
const doc = vault.users[userId].documents.find(d => d.id === 'doc_1733456789123');
console.log(doc);
```

**Expected:**
- ✅ Document found and logged
- ✅ All metadata accessible

---

### 7️⃣ Vault Page Access

#### Test 7.1: Navigate to Vault
**Steps:**
1. After saving a PDF, click link to vault (or navigate to `/vault`)
2. Observe vault page

**Expected Results:**
- ✅ Page loads with heading "Vault" or "📦 My Documents"
- ✅ List/grid of saved documents
- ✅ Recent document visible: "Test Document.pdf"

**UI Verification:**
- [ ] Document tiles show:
  - Document name/icon
  - File size
  - Created date
  - Encryption badge (🔒)

---

#### Test 7.2: View Document Details
**Steps:**
1. On vault page, look at document card
2. Hover or click to reveal details

**Expected Results:**
- ✅ File name displayed
- ✅ File size shown (e.g., "2.45 MB")
- ✅ Creation date shown (e.g., "Dec 5, 2024")
- ✅ Encryption badge visible (🔒)
- ✅ Action buttons appear:
  - 👁️ Preview
  - ⬇️ Download
  - 🔗 Share
  - 🗑️ Delete

---

#### Test 7.3: Preview Document
**Steps:**
1. On vault, hover over document
2. Click "👁️ Preview" button

**Expected Results:**
- ✅ Modal or viewer opens
- ✅ PDF pages displayed
- ✅ Can scroll through pages
- ✅ Close button to return to vault

**Technical Details:**
- [ ] PDF decrypted successfully (no "corrupted" message)
- [ ] All pages visible
- [ ] Images clear quality

---

#### Test 7.4: Download Document
**Steps:**
1. On vault, click "⬇️ Download" button
2. File downloads to device

**Expected Results:**
- ✅ Download starts (browser shows download UI)
- ✅ File named correctly: "Test Document.pdf"
- ✅ File size matches original
- ✅ Can open in PDF reader

**Post-Download Verification:**
```bash
# On system
file ~/Downloads/Test\ Document.pdf
# Should show: PDF document, version 1.4

# Try opening
open ~/Downloads/Test\ Document.pdf  # macOS
xdg-open ~/Downloads/Test\ Document.pdf  # Linux
```

---

#### Test 7.5: Delete Document
**Steps:**
1. On vault, hover over document
2. Click "🗑️ Delete"
3. Confirm deletion if prompted

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ After confirmation, document removed
- ✅ Vault grid/list updates
- ✅ Document count decreases
- ✅ localStorage updated (doc no longer present)

**Verification:**
```javascript
const userId = localStorage.getItem('biovault_userId');
const vault = JSON.parse(localStorage.getItem('biovault_documents'));
const docs = vault.users[userId].documents;
// Should not contain deleted doc ID
docs.find(d => d.id === 'deleted_doc_id'); // undefined
```

---

#### Test 7.6: Empty Vault
**Steps:**
1. Delete all documents from vault
2. Observe empty state

**Expected Results:**
- ✅ Empty state message: "📭 No documents yet" or similar
- ✅ Call-to-action: "Scan or upload your first document"
- ✅ Buttons link back to document hub

---

### 8️⃣ File Upload Flow

#### Test 8.1: Upload from Device
**Pre-conditions:** Have image files on device

**Steps:**
1. On Documents page, click "📤 Upload from Device"
2. Select Files button
3. Choose 2-3 .jpg or .png images
4. Click "Upload" or proceed

**Expected Results:**
- ✅ File picker dialog opens
- ✅ Can multi-select files
- ✅ Selected files appear in list
- ✅ File sizes displayed
- ✅ Preview thumbnails load

**File Support Check:**
- [ ] .jpg files upload
- [ ] .png files upload
- [ ] .pdf single page
- [ ] .docx preview (if supported)

---

#### Test 8.2: Validate File Size
**Steps:**
1. Try uploading a file > 50MB

**Expected Results:**
- ✅ File rejected with error: "❌ File too large"
- ✅ Cannot proceed until valid file selected
- ✅ Clear error message on why

---

#### Test 8.3: Convert Images to Review
**Steps:**
1. Upload 2 image files
2. Click "Next" or "Review"

**Expected Results:**
- ✅ Images converted to base64
- ✅ Transition to review page
- ✅ Images appear as editable pages
- ✅ Can follow same review flow as scan

---

### 9️⃣ Complete E2E Flow

#### Test 9.1: Full Scan → Review → Vault Flow
**Complete Scenario:** User scans 3-page invoice, reorders, names it, saves to vault, then retrieves

**Step-by-Step Test:**

1. **Login**
   - Navigate to `/login`
   - Enter credentials
   - Verify redirect to `/dashboard`
   - ✅ `biovault_token` in localStorage

2. **Navigate to Documents**
   - On dashboard, click "Documents"
   - Verify on `/documents` page
   - ✅ See both "Scan" and "Upload" options

3. **Scan 3 Pages**
   - Click "📷 Scan Documents"
   - Click "📷 Open Camera"
   - Capture page 1 → "✅ Page 1 captured"
   - Capture page 2 → "✅ Page 2 captured"
   - Capture page 3 → "✅ Page 3 captured"
   - ✅ Page count shows "3"
   - ✅ Thumbnails visible

4. **Review Pages**
   - Click "✅ Done (3)"
   - ✅ Review page loads
   - ✅ All 3 pages visible in grid
   - ✅ Page numbers 1, 2, 3 displayed

5. **Reorder (if needed)**
   - Click "🔄 Reorder"
   - Click "⬆️ Up" on page 2 (move to position 1)
   - ✅ Pages reorder: [2, 1, 3]
   - Click "✅ Done Reordering"

6. **Name Document**
   - Clear default PDF name
   - Enter "Business-Invoice-2024.pdf"
   - ✅ Name updates

7. **Save to Vault**
   - Click "💾 Save PDF"
   - ✅ "⏳ Generating PDF..." appears
   - ✅ "🔐 Encrypting document..." appears
   - ✅ "💾 Saving to vault..." appears
   - ✅ "✅ PDF saved to vault! 3 pages combined." appears
   - Wait 2 seconds
   - ✅ Redirect to vault/dashboard

8. **View in Vault**
   - Navigate to `/vault` (if not auto-redirected)
   - ✅ Document card displays: "Business-Invoice-2024.pdf"
   - ✅ Metadata shown (size, date, encryption badge)

9. **Verify Storage**
   - Open DevTools (F12)
   - Navigate to Application → LocalStorage
   - Find key `biovault_documents`
   - ✅ JSON structure contains document
   - ✅ `isEncrypted: true`
   - ✅ `fileData` contains "enc_"

10. **Preview Document**
    - On vault, hover over document
    - Click "👁️ Preview"
    - ✅ Modal opens with PDF
    - ✅ Can scroll through 3 pages (reordered)
    - ✅ Close button works

11. **Download Document**
    - In vault, click "⬇️ Download"
    - ✅ File downloads to device
    - ✅ Filename correct: "Business-Invoice-2024.pdf"
    - ✅ File size matches (shouldn't be huge due to compression)

12. **Delete Document**
    - In vault, click "🗑️ Delete"
    - Confirm deletion
    - ✅ Document removed from vault
    - ✅ Vault shows empty or next document

**Overall Result:**
- ✅ Full flow completed successfully
- ✅ No console errors
- ✅ All data persisted correctly
- ✅ Encryption verified

---

### 🔟 Error Scenarios

#### Test 10.1: Logout & Access Protected Vault
**Steps:**
1. Save a document
2. Clear auth: `localStorage.removeItem('biovault_token')`
3. Reload page
4. Try to access `/vault`

**Expected Results:**
- ✅ Redirects to login page
- ✅ Cannot view vault without auth
- ✅ Login again to access vault

---

#### Test 10.2: Corrupted localStorage Data
**Steps:**
1. Manually corrupt vault JSON:
   ```javascript
   localStorage.setItem('biovault_documents', '{invalid json}');
   ```
2. Reload page and try to access vault

**Expected Results:**
- ✅ App handles gracefully (error boundary catches)
- ✅ Error message displayed or recovery initiated
- ✅ Can clear data and restart

---

#### Test 10.3: Browser Storage Quota Limit
**Steps:**
1. Fill localStorage close to 5MB limit
2. Try to save large document PDF

**Expected Results:**
- ✅ Error message: "❌ Storage quota exceeded"
- ✅ User prompted to delete old documents
- ✅ Graceful degradation

---

#### Test 10.4: Network Unavailable
**Steps:**
1. Turn off network (DevTools → Network → Offline)
2. Try operations

**Expected Results:**
- ✅ Offline mode works (localStorage-based)
- ✅ Can access existing documents
- ✅ Can scan/upload locally
- ✅ When online again, sync if backend exists

---

## Performance Benchmarks

### Expected Performance Metrics:

| Operation | Expected Time | Maximum Acceptable |
|-----------|---------------|-------------------|
| Capture single page | ~100ms | < 500ms |
| Switch to next page | ~50ms | < 200ms |
| Generate PDF (3 pages) | ~1000ms | < 3000ms |
| Encrypt PDF | ~500ms | < 2000ms |
| Save to localStorage | ~50ms | < 500ms |
| Load vault page | ~200ms | < 1000ms |
| Preview decrypt & load | ~800ms | < 3000ms |
| Delete document | ~100ms | < 500ms |

### Optimization Tips:

1. **Camera Capture**: Use requestAnimationFrame for smooth preview
2. **PDF Generation**: Consider web workers for large documents
3. **Encryption**: Cache encryption keys for performance
4. **Storage**: Implement IndexedDB for documents > 5MB

---

## Debugging Techniques

### Console Logging

```javascript
// Watch vault changes
const observer = new MutationObserver(() => {
  console.log('Vault updated:', JSON.parse(localStorage.getItem('biovault_documents')));
});
observer.observe(document.documentElement, { subtree: true });

// Check encryption
const userId = localStorage.getItem('biovault_userId');
const vault = JSON.parse(localStorage.getItem('biovault_documents'));
console.log('Doc count:', vault.users[userId]?.documents.length);

// Verify camera stream
console.log('Camera active:', document.querySelector('video')?.readyState);
```

### DevTools Tips

- **Network Tab**: Monitor API calls (if backend connected)
- **Storage Tab**: Inspect localStorage in real-time
- **Performance Tab**: Record during save operation to identify bottlenecks
- **Console**: Watch for `clearException` or decryption errors

### Playwright Inspector

```bash
# Run with inspector
PWDEBUG=1 bunx playwright test --headed
```

---

## Continuous Integration Checks

### Pre-deployment Verification

```bash
# Run all E2E tests
bun run test:e2e

# Generate coverage report
bunx playwright test --reporter=html

# Check for console errors
# (Should produce zero CRITICAL errors)

# Performance audit
bunx playwright test --reporter=json | analyze-performance.js
```

---

## Known Issues & Workarounds

### Issue: Camera not initializing in desktop browser
**Workaround**: Use USB camera, check device permissions in browser settings

### Issue: Large PDF takes too long to generate
**Workaround**: Implement progress bar, consider web worker for encoding

### Issue: localStorage full error
**Workaround**: Implement IndexedDB fallback or prompt user to delete old docs

### Issue: Decryption key mismatch
**Workaround**: Verify encryptionUtils.ts, check key derivation consistency

---

## Test Reporting

### After Running Tests:

```bash
# View test report (opens in browser)
bunx playwright show-report

# Generate markdown summary
bunx playwright test --reporter=json > test-results.json
```

### Report Structure:
- ✅ Passed tests (green)
- ❌ Failed tests (red) with stack traces
- ⏭️ Skipped tests (yellow)
- ⏱️ Duration for each test

---

## Sign-Off Checklist

Before marking document feature as "Production Ready":

- [ ] All authentication tests pass
- [ ] Scan flow captures images without errors
- [ ] Review page reorder and delete work correctly
- [ ] PDF generates with correct pages
- [ ] Encryption validates (fileData starts with "enc_")
- [ ] Storage persists across page reloads
- [ ] Vault displays documents correctly
- [ ] Preview decrypts successfully
- [ ] Download produces valid PDF file
- [ ] Delete removes from vault completely
- [ ] Error handling shows user-friendly messages
- [ ] Performance acceptable (<3s for save operation)
- [ ] Mobile responsive design verified
- [ ] Camera fails gracefully
- [ ] Storage quota alerts user
- [ ] No console errors (except expected warnings)
- [ ] E2E test suite passes 100%

---

**Test Status**: 🟢 Ready for QA
**Last Updated**: Current Session
**Prepared By**: Document Management Team

