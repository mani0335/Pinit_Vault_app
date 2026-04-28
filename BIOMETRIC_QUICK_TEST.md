# 🚀 BIOMETRIC SYSTEM - QUICK START TESTING GUIDE

**Goal**: Test if your biometric system is working end-to-end on your Android phone

---

## ⚡ 5-MINUTE QUICK TEST

### Step 1: Check Backend is Running (1 min)
```bash
# Test backend health
curl https://biovault-backend-d13a.onrender.com/health

# Expected output:
# {"ok": true}
```

**❌ If fails**: Backend is down
- Check Render dashboard: https://dashboard.render.com/services

---

### Step 2: Ensure Database Table Exists (1 min)

**Important**: The biometric_users table MUST exist in your Supabase database.

**Check if table exists**:
1. Go to Supabase Console: https://app.supabase.com/project/[YOUR_PROJECT_ID]/editor/tables
2. Look for table: `biometric_users`
3. Should have columns: id, user_id, device_token, webauthn_credential, face_embedding

**❌ If table doesn't exist**, run this:
1. Go to SQL Editor in Supabase
2. Copy entire contents of: `backend/CREATE_BIOMETRIC_TABLE_SAFE.sql`
3. Paste into Supabase SQL editor
4. Click "Run"
5. Expected: "Success"

---

### Step 3: Build and Install App (2 min)

```bash
# From project root:
cd /path/to/secure-sweet-access-main

# 1. Build frontend assets
npm run build

# 2. Sync with Android
npx cap sync android

# 3. Build APK
cd android
./gradlew.bat build

# 4. Install on phone
adb install app/build/outputs/apk/release/PINIT-Vault-release.apk

# Expected: Successfully installed
```

---

### Step 4: Test on Your Phone (1 min)

```
1. Open PINIT app on your phone
2. Go to "Login" or "Register" 
3. Tap "Use Fingerprint"
4. Place your finger on the fingerprint sensor
5. Look for checkmark ✓ or success message
```

---

## 📊 WHAT SHOULD HAPPEN

### ✅ If Working Correctly

**In App**:
- Prompt says: "Place your finger on the sensor"
- Sensor turns on/lights up (some phones)
- You can scan your fingerprint
- Result: ✅ Success or ❌ Error message (clear)

**In Backend** (Check logs):
1. `https://dashboard.render.com/services` → View logs
2. Should see entries like:
   ```
   🔐 registerUser: Calling https://biovault-backend-d13a.onrender.com/auth/biometric-register
   ✅ Biometric user created: {...}
   ```

**In Database** (Check Supabase):
1. Supabase dashboard → biometric_users table
2. New row should appear with:
   - `user_id`: Your user ID
   - `device_token`: Your device ID
   - `webauthn_credential`: Fingerprint credential JSON
   - `is_active`: true

---

### ❌ If NOT Working

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Sensor not found" | Phone doesn't have fingerprint sensor | Use device with sensor or test manually |
| "Permission denied" | App missing biometric permission | Grant in Settings → Apps → PINIT → Permissions |
| Network timeout | Backend is down | Check Render dashboard |
| "User not found" | biometric_users table doesn't exist | Run CREATE_BIOMETRIC_TABLE_SAFE.sql |
| Blank screen | App crashed | Check: `adb logcat \| grep -i error` |
| Sensor won't respond | Phone biometric system issue | Restart phone, re-enroll fingerprint |

---

## 🔍 DEBUGGING: Check Device Logs

### See Real-Time App Logs
```bash
# While app is running, see logs:
adb logcat | grep -i "biometric\|fingerprint"

# Or save to file for inspection:
adb logcat > debug.log

# Then search for errors in the file
```

### Look for These Log Messages

✅ **Good Signs**:
```
✅ [BiometricCap] Biometric is available on device
✅ [APP INIT] Biometric system initialized successfully
✅ FingerprintScanner: Starting fingerprint scan
✅ BIOMETRIC SCAN SUCCESSFUL
```

❌ **Bad Signs**:
```
❌ [BiometricCap] Biometric not available on device
❌ Capacitor not initialized on native platform
❌ User not found in database
❌ error: relation "biometric_users" does not exist
```

---

## 🧪 MANUAL TESTING WITH CURL

### Test 1: Backend Connectivity
```bash
curl -v https://biovault-backend-d13a.onrender.com/health

# Expected: 200 OK with {"ok": true}
```

### Test 2: Biometric Registration
```bash
curl -X POST https://biovault-backend-d13a.onrender.com/auth/biometric-register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "deviceToken": "test-device-001",
    "webauthn": {
      "id": "fingerprint_test-user-001_abc123",
      "type": "public-key",
      "verified": true
    },
    "faceEmbedding": [0.1, 0.2, 0.3, 0.4, 0.5]
  }'

# Expected: 200 OK with {"ok": true, "userId": "test-user-001", ...}
```

### Test 3: Biometric Verification
```bash
# First, register (use Test 2 above)
# Then verify with same credential:

curl -X POST https://biovault-backend-d13a.onrender.com/auth/verify-fingerprint \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "credential": "fingerprint_test-user-001_abc123"
  }'

# Expected: 200 OK with {"verified": true, "userId": "test-user-001", ...}
```

---

## 📋 STEP-BY-STEP PHONE TESTING

### Test: Fingerprint Registration

```
1. Open PINIT app
   → See home screen with login/register options

2. Tap "Register" or "Create Account"
   → Enter email/password (if needed)

3. Look for "Fingerprint" button
   → Tap "Register Fingerprint"

4. See prompt: "Place your finger on the sensor"
   → Place finger on sensor for 1-2 seconds
   → Keep still, don't move

5. One of these should happen:
   ✅ SUCCESS: See checkmark, "Fingerprint Registered"
   ❌ FAILURE: See error message (note the exact text)

6. If failed, try again with:
   - Different finger
   - Cleaner/drier finger
   - Slower motion on sensor
```

### Test: Fingerprint Login

```
1. Close and reopen app
   → See login screen

2. Tap "Login with Fingerprint"
   → See prompt: "Place your finger on sensor"

3. Place SAME finger you registered
   → Keep still for 1-2 seconds

4. Results:
   ✅ SUCCESS: You're logged in
   ❌ FAILURE 1: "User not registered" → Need to register first
   ❌ FAILURE 2: "Fingerprint doesn't match" → Try different finger
   ❌ FAILURE 3: Network error → Backend down
```

### Test: Face Registration (if app has it)

```
1. Tap "Register Face"
   → Camera opens
   → See 16×8 grid on screen

2. Point camera at your face
   → Hold still for 2-3 seconds
   → Grid captures face pixels

3. Results:
   ✅ SUCCESS: Face embedding created
   ❌ FAILURE: Face not detected
```

---

## 🎯 VERIFICATION CHECKLIST

After running above tests, verify:

- [ ] Backend responds to /health (not down)
- [ ] biometric_users table exists in Supabase
- [ ] Phone has fingerprint sensor (Settings → Biometrics)
- [ ] App builds without errors
- [ ] App installs on phone
- [ ] App doesn't crash on launch
- [ ] Biometric registration works
- [ ] Fingerprint appears in database
- [ ] Biometric login works
- [ ] No "Cordova" or "deviceready" errors in logs

---

## 🚨 COMMON ISSUES & FIXES

### Issue: "Capacitor not initialized"
```
Causes: App running in browser (not native) or Capacitor not loaded
Fix: 
  - Test on Android phone, not browser
  - Rebuild: npm run build && npx cap sync android
```

### Issue: "Biometric not available"
```
Causes: Phone doesn't have fingerprint or permission denied
Fix:
  - Use phone with fingerprint sensor
  - Grant permission: Settings → Apps → PINIT → Permissions → USE_BIOMETRIC
  - Restart phone
```

### Issue: "Failed to register - Network error"
```
Causes: Backend is down or unreachable
Fix:
  - Check backend: curl https://biovault-backend-d13a.onrender.com/health
  - If down, restart on Render dashboard
  - Check .env VITE_API_URL is correct
```

### Issue: "User not found in database"
```
Causes: biometric_users table doesn't exist
Fix:
  - Run CREATE_BIOMETRIC_TABLE_SAFE.sql on Supabase
  - Verify table exists in dashboard
  - Restart app
```

### Issue: "Fingerprint doesn't match"
```
Causes: Different finger, dirt on sensor, or database issue
Fix:
  - Use same finger as registration
  - Clean sensor with cloth
  - Check database has correct credential
  - Re-register with same finger
```

### Issue: App Crashes on Launch
```
Causes: Biometric plugin not loaded or permission error
Fix:
  - Check: adb logcat | grep -i "crash\|error"  
  - Clean rebuild: ./gradlew clean build
  - Uninstall and reinstall: adb uninstall com.biovault.app
```

---

## 📞 GETTING HELP

### Check Logs for Error Details
```bash
# Save complete logs
adb logcat > full_biometric_debug.log

# Search for ERRORS
adb logcat | grep -i error

# See last 50 lines
adb logcat | tail -50

# Real-time filtering
adb logcat | grep -E "Biometric|error|Exception|crash"
```

### Backend Logs
1. Go to Render dashboard: https://dashboard.render.com/services
2. Select your service
3. Click "Logs" tab
4. Look for errors, exceptions, or failed API calls

### Database Logs
1. Go to Supabase: https://app.supabase.com/project/[ID]/logs
2. Look for failed INSERT statements
3. Check if biometric_users table queries work

---

## ✨ SUCCESS INDICATORS

### Phase 1: Setup ✅
- [ ] `npm run build` completes without errors
- [ ] APK builds successfully
- [ ] APK installs on phone
- [ ] App launches without crash
- [ ] No "Cordova" errors in console

### Phase 2: Hardware ✅
- [ ] Phone has fingerprint sensor
- [ ] Sensor responds when touched
- [ ] OS shows fingerprint works (Settings test)
- [ ] App has biometric permission

### Phase 3: Backend ✅
- [ ] Backend /health endpoint responds
- [ ] biometric-register endpoint works
- [ ] verify-fingerprint endpoint works
- [ ] Database table exists and accepts data

### Phase 4: Integration ✅
- [ ] Registration captures fingerprint
- [ ] Data saved to biometric_users table
- [ ] Login retrieves and matches credential
- [ ] User successfully authenticates

---

**Test Status**: Ready to Test 🚀

**Recommended**: Spend 15-20 minutes doing the Step-by-Step Phone Testing above.  
If all checks pass: ✅ **BIOMETRIC SYSTEM IS WORKING**

