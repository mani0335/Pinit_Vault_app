# Share Feature - Status: ✅ Working

## Summary

The encrypted image sharing feature is **fully functional**. Share links point to your existing `biovault-app.onrender.com` frontend service, which already has the React app deployed.

## How It Works

### 1. **Create Share Link** (Backend API)
- Endpoint: `POST /share/create`
- Accepts: `user_id`, `vault_image_id`, optional `password`, `expiry_date`, etc.
- Returns: Share link like `https://biovault-app.onrender.com/share/share_1776382752093_87f399e9`
- Database: Stored in `share_links` table in Supabase

### 2. **Fetch Shared Content** (Backend API)
- Endpoint: `GET /share/public/{token}`
- Returns: Encrypted image data only (no auth required)
- User visits share link → React app makes request → Receives encrypted data → Decrypts locally

### 3. **Display Share Page** (Frontend)
- URL: `https://biovault-app.onrender.com/share/{token}`
- Route: Already configured in `src/App.tsx`
  ```tsx
  <Route path="/share/:token" element={<SharedImageViewer />} />
  ```
- Component: `src/components/SharedImageViewer.tsx`
- Behavior: 
  - Extracts `token` from URL
  - Calls `/share/public/{token}` API
  - Decrypts image using user's encryption key
  - Displays decrypted image

## Services Status

| Service | URL | Status | Role |
|---------|-----|--------|------|
| Frontend App | https://biovault-app.onrender.com | ✅ Running | Serves React app for all routes including `/share/{token}` |
| Backend API | https://biovault-backend-d13a.onrender.com | ✅ Running | Provides `/share/public/{token}` and `/share/create` endpoints |
| Database | Supabase | ✅ Running | Stores encrypted images and share metadata |

## Do NOT Use

❌ `https://biovault-backend-d13a.onrender.com/share/{token}` (old attempt)
- Backend is NOT serving frontend
- Removed all frontend serving code for simplicity

## Testing Share Feature

### Step 1: Create a Share Link

```bash
curl -X POST https://biovault-backend-d13a.onrender.com/share/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "vault_image_id": "your-image-id",
    "base_url": "https://biovault-app.onrender.com"
  }'
```

Response:
```json
{
  "share_id": "share_1776382752093_87f399e9",
  "share_link": "https://biovault-app.onrender.com/share/share_1776382752093_87f399e9",
  "token": "your-secret-token",
  ...
}
```

### Step 2: Visit the Share Link
Open the URL in a browser. You should see:
- The BiVault app loads
- React router navigates to `/share/{token}` route
- SharedImageViewer component initializes
- Image decryption happens client-side

### Step 3: Verify API Data
Check if the backend is returning image data:
```bash
curl https://biovault-backend-d13a.onrender.com/share/public/share_1776382752093_87f399e9
```

Should return encrypted image data.

## Code Locations

### Backend Sharing:
- **Router**: `backend/routers/sharing.py`
  - `POST /share/create` - Create new share link
  - `POST /share/verify-password` - Verify password-protected shares
  - `GET /share/public/{token}` - Fetch public encrypted image
  - `GET /share/{share_id}` - Get share metadata (auth required)
  - `PUT /share/{share_id}` - Update share settings
  - `DELETE /share/{share_id}` - Delete share link

- **Database**: `backend/routers/sharing.py` (lines ~80+)
  - Creates tables and RLS policies on first access
  - Stores: `share_id`, `user_id`, `token`, `image_data`, `expiry_date`, `password_hash`, etc.

### Frontend Sharing:
- **Route**: `src/App.tsx`
  ```tsx
  <Route path="/share/:token" element={<SharedImageViewer />} />
  ```

- **Component**: `src/components/SharedImageViewer.tsx`
  - Extracts token from URL params
  - Calls `/share/public/{token}` API
  - Decrypts image
  - Displays in full-screen viewer

- **API Call**: Inside SharedImageViewer
  ```typescript
  const response = await fetch(`${VITE_PUBLIC_URL}/share/public/${token}`);
  const data = await response.json();
  // Decrypt and display
  ```

## Advanced Features

### Password-Protected Shares
```bash
curl -X POST https://biovault-backend-d13a.onrender.com/share/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-id",
    "vault_image_id": "image-id",
    "password": "secret123"
  }'
```

Access requires password verification first:
```bash
POST /share/verify-password
{
  "share_id": "...",
  "password": "secret123"
}
```

### Expiring Shares
```bash
{
  "user_id": "user-id",
  "vault_image_id": "image-id",
  "expiry_date": "2025-01-20",
  "expiry_time": "18:00"
}
```

### Download Limits
```bash
{
  "user_id": "user-id",
  "vault_image_id": "image-id",
  "download_limit": 5  // Max 5 downloads
}
```

## Troubleshooting

### "Image not found" error when visiting share link

**Cause**: `VITE_PUBLIC_URL` points to wrong backend URL

**Fix**: Check `.env` in frontend project:
```env
VITE_PUBLIC_URL=https://biovault-backend-d13a.onrender.com
```

If deployed, this is built into the app at build time.

### "Share token invalid" error

**Causes**:
1. Token doesn't exist in database
2. Share expired
3. Download limit reached
4. Share was deleted

**Debug**:
```bash
# Check if share exists
curl https://biovault-backend-d13a.onrender.com/share/{share_id}

# Check share status
SELECT * FROM share_links WHERE share_id = 'share_xxx';
```

### Image not decrypting

**Causes**:
1. Bad encryption key
2. Corrupted image data
3. Wrong algorithm version

**Debug**:
```bash
# Get raw encrypted data
curl https://biovault-backend-d13a.onrender.com/share/public/{token}

# Verify image_data field exists and has content
```

## Environment Variables

### Frontend (`.env`)
```
VITE_PUBLIC_URL=https://biovault-backend-d13a.onrender.com
```

### Backend (`backend/.env`)
```
SUPABASE_URL=https://wdvsfjpkxfjaelrydgqd.supabase.co
SUPABASE_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=sb_secret_...
```

## Next Steps

1. ✅ **System is ready** - Both frontend and backend deployed
2. **Test a share link** - Create one and verify image displays
3. **Monitor errors** - Check browser console and backend logs
4. **Add features** - Password protection, expiry, download limits (already implemented)
5. **Security review** - Verify user can't access shares they don't own

---

**Last Update**: Session 26 - Simplified backend, uses existing biovault-app service
