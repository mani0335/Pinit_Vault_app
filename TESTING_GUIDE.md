# 🚀 COMPLETE FLOW TESTING GUIDE

## PART 1: MANUAL TESTING (Step-by-Step)

### Phase 1: Registration Flow
Follow these exact steps in the APK/App:

1. **Launch App**
   - ✅ Splash screen shows "PINIT VAULT"
   - ✅ Should auto-redirect to Login or Biometric Options

2. **Navigate to Registration**
   - Tap "Register" or "BiometricOptions"
   - Should see: "TEMPORARY ID", "FINGERPRINT", "FACE", "USER ID" steps

3. **Fingerprint Registration**
   - Tap fingerprint scanner
   - Place finger on sensor (or simulate)
   - Watch for: "✅ Fingerprint captured"

4. **Face Registration**
   - Tap face scanner
   - Align face in frame
   - Watch for: "✅ Face captured" + "Face embedding: 128 dimensions"
   - ⚠️ IMPORTANT: Check browser console for `/biometric-register` call

5. **Complete Registration**
   - Should show success screen
   - Should generate recovery code
   - Should redirect to Dashboard

**Console Log Checklist:**
```
✅ "📝 Biometric Register: userId=USR-XXXXX"
✅ "📊 Face embedding length: 128"
✅ "✅ Face embedding sum: XXX.XXXX"
✅ "✅ Biometric user created: {user_record}"
✅ "💾 Saving access token from registration"
✅ "📝 STEP 5: Verifying user was created on backend..."
```

---

### Phase 2: Login Flow

1. **Kill app completely** (or restart)

2. **Launch App Again**
   - Should show splash screen
   - Should check for `biovault_token` in storage
   - If token exists: Skip to Dashboard
   - If no token: Go to Login

3. **Enter User ID**
   - Enter the userId from registration (USR-XXXXX)

4. **Fingerprint Verification**
   - Tap fingerprint scanner
   - Watch for: "✅ Fingerprint verified! Now proceed to face verification"

5. **Face Verification**
   - Tap face scanner
   - Align face same as registration
   - Watch for: "✅ Face verified!"
   - Should show similarity score (e.g., "98% match")

6. **Dashboard Access**
   - Should redirect to Dashboard
   - Should see user info
   - ✅ LOGGED IN SUCCESSFULLY

**Console Log Checklist:**
```
✅ "🔍 Login: Checking for userId: USR-XXXXX"
✅ "✅ Login: User found, showing login page"
✅ "✅ Fingerprint verified! Now proceed to face verification"
✅ "🔍 Verifying face with backend for userId: USR-XXXXX"
✅ "✅ Face verified! Storing tokens"
✅ "💾 Access token stored"
✅ "💾 Refresh token stored"
```

---

### Phase 3: Temporary Access Flow

1. **From splash/login, tap "Temporary Access"**

2. **Scan Face**
   - System should search ALL users in database
   - If registered user: Access granted
   - If unregistered face: Access denied

**Console Log Checklist:**
```
✅ "🔍 TempAccessFace: Verifying face with backend (searching all users)"
✅ "📊 TempAccess: Found X registered users"
✅ "📈 TempAccess: User USR-XXXXX - Similarity: X.XXXX"
✅ "✅ TempAccess: SUCCESS - User matched"
✅ "💾 Verified userId stored"
✅ "💾 Temp access token stored"
```

---

## PART 2: VERIFY DATA IN SUPABASE

Run these queries in your Supabase SQL Editor:

### Query 1: Check Registered Users
```sql
SELECT 
    user_id,
    device_token,
    is_active,
    created_at,
    array_length(face_embedding, 1) as embedding_dimensions
FROM biometric_users
ORDER BY created_at DESC;
```

**Expected Output:**
```
user_id      | device_token  | is_active | created_at              | embedding_dimensions
USR-123456   | DEV-ABC123    | true      | 2026-04-09 16:45:00    | 128
```

### Query 2: Check Face Embeddings Are Stored
```sql
SELECT 
    user_id,
    CASE WHEN face_embedding IS NOT NULL THEN '✅ YES' ELSE '❌ NO' END as face_stored,
    CASE WHEN face_embedding IS NOT NULL THEN array_length(face_embedding, 1) ELSE 0 END as dimensions,
    CASE WHEN face_embedding IS NOT NULL THEN round(face_embedding[1]::numeric, 4) ELSE 0 END as first_value
FROM biometric_users
ORDER BY created_at DESC;
```

**Expected Output:**
```
user_id      | face_stored | dimensions | first_value
USR-123456   | ✅ YES      | 128        | 0.1234
```

### Query 3: Check WebAuthn Data
```sql
SELECT 
    user_id,
    CASE WHEN webauthn_credential IS NOT NULL THEN '✅ YES' ELSE '❌ NO' END as webauthn_stored,
    CASE WHEN webauthn_credential IS NOT NULL THEN jsonb_typeof(webauthn_credential) ELSE 'null' END as type
FROM biometric_users
ORDER BY created_at DESC;
```

### Query 4: List All Data (Debug)
```sql
SELECT 
    id,
    user_id,
    device_token,
    is_active,
    created_at,
    (face_embedding IS NOT NULL) as has_face,
    (webauthn_credential IS NOT NULL) as has_webauthn
FROM biometric_users
ORDER BY created_at DESC
LIMIT 10;
```

---

## PART 3: CHECK BACKEND LOGS

### If using Render.com:
1. Go to your Render dashboard
2. Find "biovault-backend" service
3. Click "Logs"
4. Search for: `"Biometric Register"` or `"Face verification"`

**Look for:**
```
📝 Biometric Register: userId=USR-XXXXX, deviceToken=DEV-ABC123
📊 Face embedding length: 128
✅ Face embedding sum: XXX.XXXX
✅ Biometric user created: {user_record}
```

---

## PART 4: BROWSER DEVELOPER TOOLS

### Network Tab:
1. Open Chrome DevTools (F12)
2. Go to "Network" tab
3. Filter by "biometric-register" or "verify-face"

**Should see:**
```
POST /auth/biometric-register    → 200 OK
  Request: {userId, deviceToken, faceEmbedding: [128 numbers]}
  Response: {ok: true, token: "...", refreshToken: "..."}

POST /auth/verify-face           → 200 OK
  Request: {faceEmbedding: [128 numbers], userId: "USR-XXXXX"}
  Response: {verified: true, similarity: 0.95}
```

### Application/Storage Tab:
1. Go to "Application" tab
2. Click "Local Storage" → Your app URL
3. Look for:
```
biovault_userId          → "USR-XXXXX"
biovault_token           → "eyJhbGc..."
biovault_refresh_token   → "eyJhbGc..."
```

---

## TROUBLESHOOTING CHECKLIST

### ❌ Registration fails?
- [ ] Check backend URL is correct in code
- [ ] Check Firebase/Cloudinary keys in backend
- [ ] Check CORS is enabled in backend
- [ ] Look for face embedding errors in console

### ❌ Face not matching?
- [ ] Check similarity threshold (70% for login, 35% for temp)
- [ ] Try different lighting/angle
- [ ] Check face embedding is actually 128 dimensions
- [ ] Verify face stored in Supabase (Query 2 above)

### ❌ Token not stored?
- [ ] Check `appStorage.setItem()` calls
- [ ] Check localStorage/sessionStorage in DevTools
- [ ] Check both exist: `biovault_token` AND `biovault_userId`

### ❌ Login loops back to login?
- [ ] Check userId is saved to storage
- [ ] Check token is present when on Dashboard
- [ ] Check Index.tsx token check logic

---

## SUCCESS INDICATORS ✅

| Check | Pass | Location |
|-------|------|----------|
| Face embedding captured | 128 numbers, sum > 0 | Browser console |
| Backend receives data | No 400/500 errors | Network tab |
| Data stored in Supabase | Query returns rows | Supabase SQL |
| Face embedding saved | array_length = 128 | Supabase SQL |
| Similarity calculated | >= 70% for login | Backend logs |
| Tokens generated | JWT tokens present | Browser storage |
| Token stored | Both token types | Application tab |
| Dashboard loads | User can see data | Browser |
| Logout works | Tokens cleared | localStorage |

---

## QUICK TEST SCRIPT

Run this in browser console to check tokens:

```javascript
// Check stored tokens
console.log("=== TOKEN CHECK ===");
console.log("userId:", localStorage.getItem("biovault_userId"));
console.log("token:", localStorage.getItem("biovault_token")?.slice(0,20) + "...");
console.log("refresh:", localStorage.getItem("biovault_refresh_token")?.slice(0,20) + "...");
```

**Expected output:**
```
=== TOKEN CHECK ===
userId: USR-123456
token: eyJhbGciOiJIUzI1NiIsI...
refresh: eyJhbGciOiJIUzI1NiIsI...
```
