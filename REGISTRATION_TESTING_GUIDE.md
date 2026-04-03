# End-to-End Registration Flow Testing Guide

## 1. Create Database Table (REQUIRED)

Go to [Supabase Dashboard](https://app.supabase.com) and run the SQL:

1. Open your PINIT Vault project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the SQL from `backend/CREATE_BIOMETRIC_USERS_TABLE.sql`
5. Click **Run**
6. Wait for success message "Successfully executed query"

**What this does:**
- Creates `biometric_users` table to store registration data
- Adds indexes for faster lookups
- Enables Row Level Security

---

## 2. Rebuild Web App & APK

```bash
# Build web assets with corrected endpoint
npm run build

# Sync to Android
npx cap sync android

# Build APK (debug for testing)
cd android && ./gradlew assembleDebug
```

**Output files:**
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (7-8 MB)
- Release APK: `android/app/build/outputs/apk/release/app-release.apk` (6 MB)

---

## 3. Install APK on Phone

### Option A: Using Android Studio
1. Open Android Studio
2. Device → Physical → Select your phone
3. Run → Select app-debug

### Option B: Command Line
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Option C: Manual
1. Copy APK to phone via USB
2. Open file manager, tap the APK to install

---

## 4. Test Registration Flow on Phone

### Scenario: Fresh Start (New User)

1. **Launch App**
   - Tap app icon to open
   - Should show login/splash screen

2. **Fingerprint Scan (Login)**
   - Tap "Scan Fingerprint" or "Login"
   - Place finger on sensor
   - If fingerprint not found → Shows **BiometricOptions** page with 2 buttons

3. **Choose Register**
   - Tap **"Register"** button
   - Should navigate to Register page

4. **Step 1: Generate temp ID**
   - Auto-generates userId
   - Should show "Fingerprint → Face → Create Account"

5. **Step 2: Fingerprint Enrollment**
   - Tap "Scan Fingerprint"
   - Place finger on sensor
   - Should successfully scan and save

6. **Step 3: Face Enrollment**
   - Should see face scanner UI
   - Hold phone up, wait for face detection
   - Should successfully scan and save

7. **Step 4: Store & Verify (Critical Test)**
   - Tap **"STORE & VERIFY"** button
   - Backend should receive payload:
     ```json
     {
       "userId": "unique-id",
       "deviceToken": "device-token",
       "webauthn": {},
       "faceEmbedding": [...]
     }
     ```
   - ✅ **Success**: Shows recovery code, "Registration Complete"
   - ❌ **Error**: Check console for error message

8. **Verify Dashboard**
   - Tap "Login Now" or "Home"
   - Should see dashboard with your vault
   - Data should be persisted in Supabase

---

## 5. Troubleshooting

### Error: "Registration failed (404)"
- **Cause**: Endpoint path wrong
- **Fix**: Check frontend is calling `/auth/biometric-register`

### Error: "Table 'biometric_users' not found"
- **Cause**: SQL migration not run in Supabase
- **Fix**: Run `CREATE_BIOMETRIC_USERS_TABLE.sql` in Supabase SQL Editor

### Error: "Connection refused (port 8000)"
- **Cause**: Backend not running
- **Fix**: 
  ```bash
  cd secure-sweet-access-main
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
  ```

### Error: "Missing userId" / "Missing deviceToken"
- **Cause**: Frontend not sending required fields
- **Fix**: Check `src/pages/Register.tsx` is collecting all data before calling `registerUser()`

### Error: JSON parse error / HTML response
- **Cause**: Backend returning error HTML instead of JSON
- **Fix**: Check backend logs for specific error message

---

## 6. Backend Logs

To see detailed backend logs while testing:

```bash
cd secure-sweet-access-main
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level debug
```

Look for:
- POST request to `/auth/biometric-register`
- Record inserted into `biometric_users`
- Response with `ok: true` and temp code

---

## 7. Phone Console Logs

On Android phone:
1. Install Android Studio / Android Monitor
2. Connect phone via USB
3. Run: `adb logcat | grep -i biovault`
4. Watch for error messages during registration

---

## 8. Export Test Results

After successful registration:
1. Screenshot of "Registration Complete" message
2. Check Supabase: `biometric_users` → New row with your userId
3. Check Dashboard: Your vault is accessible
4. Test Temporary Access: Logout → Fingerprint fails → "Temporary Access" button available

---

## Checklist

- [ ] SQL table created in Supabase
- [ ] Web build successful (npm run build)
- [ ] APK built successfully
- [ ] APK installed on phone
- [ ] App launches without crashes
- [ ] Fingerprint scan responds
- [ ] BiometricOptions page shows Register button
- [ ] Register flow completes all 4 steps
- [ ] "Store & Verify" button triggers backend call
- [ ] Backend responds with success (200 + JSON)
- [ ] New row appears in `biometric_users` table
- [ ] Dashboard loads after registration
- [ ] Data persists on re-launch

---

**Contact Backend Issues**: Check `https://localhost:8000/docs` for interactive API testing
