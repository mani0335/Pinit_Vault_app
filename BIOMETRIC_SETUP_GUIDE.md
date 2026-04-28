# 🔐 Biometric Setup & Installation Guide

## ✅ What Was Fixed

### Issue #1: Plugin Configuration Mismatch
- **Before**: Mixed Cordova (`cordova-plugin-fingerprint-aio`) with Capacitor config
- **After**: Pure Capacitor Biometric plugin (`@capacitor/biometric`)
- **Benefit**: Better integration, native Android/iOS support, modern approach

### Issue #2: Service Name Mismatch  
- **Before**: Code called `FingerprintAuth` (Cordova naming)
- **After**: Uses `Biometric` from `@capacitor/biometric` (Capacitor)
- **Benefit**: Proper Capacitor integration, works with native bridges

### Issue #3: Missing Dependencies
- **Before**: `@capacitor/biometric` was not in package.json
- **After**: Added `@capacitor/biometric: ^6.0.0`
- **Benefit**: Plugin is properly declared

### Issue #4: Capacitor Config Error
- **Before**: Referenced non-existent `BiometricAuth` plugin
- **After**: Properly configured `Biometric` plugin
- **Benefit**: Capacitor can load plugin correctly

---

## 📋 Installation Steps

### Step 1: Install Dependencies
```bash
cd "c:\Users\manish\Desktop\secure-sweet-access-main\secure-sweet-access-main"
npm install
# OR
bun install
```

### Step 2: Sync Capacitor with Android Project
```bash
npx cap sync android
# This will:
# - Copy web assets to android/app/src/main/assets
# - Update Android manifest with required permissions
# - Install Capacitor plugins
```

### Step 3: Update Android Project
```bash
cd android
./gradlew.bat clean build
cd ..
```

### Step 4: Build Web Assets
```bash
npm run build
# OR
bun run build
```

### Step 5: Sync Again After Build
```bash
npx cap sync android
```

---

## 📱 Running on Android Device/Emulator

### Option A: Using Capacitor CLI (Recommended)
```bash
npx cap run android
# This will:
# - Build the Android project
# - Install the APK
# - Launch the app
# - Enable hot reload
```

### Option B: Manual Steps
1. **Start Android Emulator** or **Connect Physical Device**
   ```bash
   adb devices  # Verify device is connected
   ```

2. **Build APK**
   ```bash
   cd android
   ./gradlew.bat assembleDebug
   cd ..
   ```

3. **Install APK**
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Launch App**
   ```bash
   adb shell am start -n com.biovault.app/.MainActivity
   ```

### Option C: Android Studio
1. Open `android/` folder in Android Studio
2. Select your device/emulator
3. Click "Run" (green play button)

---

## 🧪 Testing Biometric Features

### Test 1: Check Biometric Availability
1. Open app console (Chrome DevTools)
2. Look for log messages:
   ```
   ✅ [BiometricCap] Capacitor Biometric plugin loaded
   ✅ Biometric is available on device
   Biometric type: [fingerprint|iris|face|etc]
   ```

### Test 2: Test Fingerprint Registration
1. Navigate to **Register** page
2. Click **"Capture Fingerprint"** button
3. **Expected**: Native fingerprint prompt appears
4. **Action**: Place your finger on sensor
5. **Expected**: Success message with checkmark

### Test 3: Test Fingerprint Login
1. Navigate to **Login** page
2. **Expected**: Fingerprint scan starts automatically
3. **Action**: Place your finger on sensor
4. **Expected**: Redirected to Dashboard on success

### Test 4: Face Recognition
1. Navigate to page with **"Capture Face"** button
2. Click to start face capture
3. **Expected**: Camera access request appears
4. **Grant** camera permission
5. **Action**: Move your face into center
6. **Expected**: Face detected and registered

---

## ⚠️ Common Issues & Fixes

### Issue: "Capacitor not available"
- **Cause**: App not running in native environment
- **Fix**: Use `npx cap run android` instead of `npm run dev`

### Issue: "Biometric plugin not installed"
- **Cause**: Plugin not synced
- **Fix**: Run `npx cap sync android`

### Issue: "Biometric hardware not available"
- **Cause**: Device doesn't have biometric sensor
- **Fix**: Use emulator with biometric support or physical device
- **How to enable in emulator**: 
  - Android Studio > Extended Controls > Fingerprint
  - Emulator Settings > Advanced > Show boot options

### Issue: "User cancelled"
- **Cause**: User tapped "Cancel" on biometric prompt
- **Fix**: Code handles this gracefully - user can retry

### Issue: APK Installation Fails (exit code 1)
- **Cause**: No Android device connected
- **Fix**: 
  ```bash
  # Connect device via USB with debugging enabled, OR
  # Start Android emulator
  adb devices  # Should show device
  ```

### Issue: Building takes long time
- **Cause**: First build downloads dependencies
- **Fix**: Wait 3-5 minutes. Subsequent builds are faster.

---

## 🔧 Biometric API Reference

### `isBiometricAvailable()`
Checks if device has biometric hardware
```typescript
const { available, reason } = await isBiometricAvailable();
if (available) {
  // Device has fingerprint/face sensor
} else {
  // Not available: reason = error message
}
```

### `requestBiometricPermission()`
Ensures permissions are granted (Capacitor handles this)
```typescript
const granted = await requestBiometricPermission();
```

### `showBiometricPrompt(options?)`
Shows native biometric authentication prompt
```typescript
try {
  await showBiometricPrompt({
    reason: "Verify your identity",
    title: "Authentication",
    disableBackup: false  // Allow PIN/pattern as backup
  });
  // User authenticated successfully
} catch (error) {
  // User cancelled or auth failed
}
```

### `initializeBiometric()`
Initializes and checks the biometric system
```typescript
const { success, error } = await initializeBiometric();
if (success) {
  // Biometric system is ready
} else {
  // error = why it failed
}
```

---

## 📊 Plugin Capabilities

| Biometric Type | Android | iOS | Notes |
|---|---|---|---|
| Fingerprint | ✅ | ✅ | Most common |
| Face | ✅ | ✅ | iPhone X+ |
| Iris | ✅✅ (Samsung) | ❌ | Limited |
| PIN Fallback | ✅ | ✅ | If biometric fails |
| Pattern Fallback | ✅ | ❌ | Android only |

---

## 🔐 Security Notes

1. **Hardware-backed**: Biometric data stays on device
2. **No Storage**: We never store biometric templates
3. **Credential ID**: Only credential ID is stored (for verification)
4. **Encrypted**: Credentials encrypted in backend database
5. **WebAuthn Compatible**: Uses WebAuthn-compatible credential objects

---

## 📝 Project Structure

```
src/
├── lib/
│   ├── biometric.ts          ← Core biometric functions (UPDATED)
│   ├── authService.ts        ← Backend API calls
│   ├── faceDetection.ts      ← Face recognition
│   └── storage.ts            ← Local storage
├── components/
│   ├── FingerprintScanner.tsx ← Fingerprint UI
│   ├── FaceScanner.tsx       ← Face capture UI
│   └── ...
└── pages/
    ├── Register.tsx          ← Registration flow
    ├── Login.tsx             ← Login flow
    └── ...

capacitor.config.ts          ← UPDATED with Biometric plugin
package.json                 ← UPDATED with @capacitor/biometric
```

---

## 🚀 Next Steps

1. **Run**: `npx cap run android`
2. **Test**: All scenarios above
3. **Monitor**: Check console logs for [BiometricCap] messages
4. **Enjoy**: Secure biometric authentication! 🎉

---

## 📞 Support

If issues persist:
1. Check console logs for `[BiometricCap]` prefix
2. Verify device has biometric hardware (`adb shell`)
3. Ensure Android API level >= 21
4. Clear cache: `npx cap sync android --sync`

