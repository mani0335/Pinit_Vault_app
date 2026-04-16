# 📱 Android Build & Testing Guide

> Build and deploy BioVault to your physical Android device via Capacitor

---

## ✅ Current Status

```
✓ Web assets built (dist/ folder ready)
✓ Capacitor synced with Android project
✓ 3 Cordova plugins installed (fingerprint, socialsharing, promise)
✓ 5 Capacitor plugins ready (camera, device, filesystem, preferences, share)
```

---

## 📋 Prerequisites

Before building the APK, ensure you have:

### 1. **Android SDK Setup**
```bash
# Check if Android SDK is installed
# Open Android Studio → SDK Manager
# Ensure you have:
  ✓ Android SDK 33 or higher
  ✓ SDK Platform (latest)
  ✓ Android SDK Build Tools
  ✓ Android Emulator (for testing)
  ✓ Android SDK Platform-Tools
```

### 2. **Set ANDROID_HOME Environment Variable**

**On Windows (PowerShell):**
```powershell
# Find your Android SDK location
# Usually: C:\Users\YourUsername\AppData\Local\Android\Sdk

# Set environment variable
[Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\manish\AppData\Local\Android\Sdk', 'User')

# Verify
echo $env:ANDROID_HOME
```

### 3. **Java Development Kit (JDK)**
```bash
# Check if Java is installed
java -version

# You need JDK 11 or higher
# If not installed, download from: https://www.oracle.com/java/technologies/downloads/
```

### 4. **Gradle**
```bash
# Check gradle version
gradle -v

# If not installed, Android Studio includes it
# Or download from: https://gradle.org/releases/
```

---

## 🔨 Build Options

### **Option A: Build & Run via Android Studio (RECOMMENDED)**

**Easiest approach - full IDE support:**

```bash
# 1. Open Android project in Android Studio
npx cap open android

# 2. Connect physical Android phone via USB

# 3. Enable USB Debugging on phone:
#    Settings → Developer Options → USB Debugging (toggle ON)

# 4. In Android Studio:
#    a) Select your device from dropdown (top right)
#    b) Click green "Run" button
#    c) App will build and install automatically

# 5. Wait for build to complete (~2-3 minutes first time)

# 6. App launches on your phone automatically
```

---

### **Option B: Build APK from Command Line**

**For CI/CD or advanced users:**

```bash
# 1. Connect physical Android phone via USB

# 2. Build and run via Gradle
cd android
gradlew installDebug

# 3. View build progress
# App installs automatically on connected device

# 4. Find logs if needed
adb logcat -s "Capacitor"
```

---

### **Option C: Build Signed APK (for Distribution)**

**For app store release:**

```bash
# 1. Create keystore (one time only)
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000

# 2. Build signed APK
cd android
gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=../release.keystore \
  -Pandroid.injected.signing.store.password=YourPassword \
  -Pandroid.injected.signing.key.alias=release \
  -Pandroid.injected.signing.key.password=YourPassword

# 3. APK location: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🚀 Quick Start (Recommended Path)

### **Step 1: Enable USB Debugging on Phone**

```
1. Go to Settings
2. Scroll to "About phone"
3. Tap "Build number" 7 times (becomes developer)
4. Back to Settings → Developer Options
5. Enable "USB Debugging"
6. Plug phone into computer via USB
7. Allow USB debugging permission on phone
```

### **Step 2: Verify Connection**

```bash
adb devices

# You should see:
# List of attached devices
# YOUR_DEVICE_ID    device
```

### **Step 3: Open in Android Studio**

```bash
npx cap open android
```

### **Step 4: Select Device & Run**

```
1. In Android Studio top toolbar
2. Select your phone from device dropdown
3. Click green ▶ Run button
4. Wait for build (may take 2-3 minutes first time)
5. App auto-installs and launches
```

---

## 🔍 Troubleshooting

### **"adb: command not found"**
```bash
# Add platform-tools to PATH
# Windows: Set ANDROID_HOME and restart PowerShell
$env:PATH += ";$env:ANDROID_HOME\platform-tools"

# Verify
adb version
```

### **"Device not found" / "No Devices Attached"**
```bash
# 1. Check USB connection
# 2. Enable USB Debugging on phone (Settings → Developer Options)
# 3. Accept USB debugging permission on phone
# 4. Try reconnecting USB cable
# 5. Restart adb
adb kill-server
adb start-server
adb devices
```

### **"Gradle build failed: SDK not found"**
```bash
# Install Android SDK via Android Studio
# Or set ANDROID_HOME correctly
echo $env:ANDROID_HOME

# Should output: C:\Users\manish\AppData\Local\Android\Sdk
# If nothing, set it:
[Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\manish\AppData\Local\Android\Sdk', 'User')
```

### **"Build takes too long"**
```bash
# First build is always slow (~3-5 min)
# Subsequent builds cache and run faster (~30-60 sec)
```

### **App crashes on startup**
```bash
# Check logcat output
adb logcat -s "Capacitor"

# Also check Android Studios logcat tab
# Look for JavaScript errors or permission issues
```

---

## 📊 Test Checklist After Installation

Once app launches on your phone, test:

- ✅ **Fingerprint Login** - Does fingerprint scanner work?
- ✅ **Face Recognition** - Does face scanner work?
- ✅ **Navigation** - Can you navigate all dashboard pages?
- ✅ **Image Upload** - Can you capture/upload images?
- ✅ **Encryption** - Does image encryption work?
- ✅ **Activity Log** - Are actions logged?
- ✅ **Settings** - Can you access user profile?
- ✅ **Permissions** - Camera, microphone, storage access working?

---

## 📱 Testing With Physical Device

### **Best Practices**

```
1. Close other apps (free up memory)
2. Keep phone plugged in during development
3. Use Recent Apps (swipe up) to switch between apps
4. Check system logs for errors: adb logcat

5. After each code change:
   npm run build
   npx cap sync android
   Click Run in Android Studio
```

### **Real-time Debugging**

```bash
# View live logs from your phone
adb logcat | grep "Capacitor"

# Or in Android Studio:
# View → Tool Windows → Logcat
```

---

## 🎯 Next Steps After Building

Once app is running on your phone:

1. **Test Biometric Auth** - Use fingerprint + face
2. **Upload Image** - Take photo or select from gallery
3. **Encrypt Image** - Test LSB steganography
4. **Check Activity Log** - Verify events are tracked
5. **Export Data** - Download vault from Settings

---

## 📚 Additional Resources

- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Android Studio Setup](https://developer.android.com/studio/install)
- [Android SDK Setup](https://developer.android.com/studio/command-line/sdkmanager)
- [adb Command Reference](https://developer.android.com/studio/command-line/adb)

---

## ✨ What's Ready?

```
✓ Web build complete (dist/ folder)
✓ Capacitor synced (assets in android/)
✓ All plugins installed
✓ Build config ready

Just connect phone + click Run in Android Studio!
```

---

**Last Updated:** April 15, 2026  
**Build Status:** Ready for Testing ✅
