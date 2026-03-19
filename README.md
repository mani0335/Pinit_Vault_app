# Biovault App

## Project Info

This repository contains the Biovault mobile/web app, a biometric vault demo built with Vite + React + TypeScript and packaged with Capacitor for Android.

## Tech Stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Capacitor (Android)
- Express (mock backend)

## Current Work (What I am doing)

The following items describe the active implementation workflow in this project:

- Implement biometric-first login (fingerprint with secure fallback behavior).
- Validate user + device binding through backend API checks.
- Support temporary access flow when device mismatch occurs.
- Support first-time user registration with biometric enrollment.
- Keep backend verification isolated from raw biometric payloads.
- Build and test Android debug APK through Capacitor + Gradle.
- Improve routing and error-handling paths for login and registration.

## Workflow Graph

```mermaid
flowchart TD
    A[App Start] --> B[Splash Screen]
    B --> C[Fingerprint Scan]
    C --> D{Fingerprint Found?}

    D -->|Yes| E[Device ID Check]
    E -->|Device Match| F[Face Authentication]
    F --> G[Vault Dashboard]

    E -->|Device Mismatch| H[Temporary Access]
    H --> I[Enter Temporary Code]
    I --> J[Code Verification]
    J --> K[Register Biometrics]
    K --> L[Update Device ID]
    L --> M[Login Again]
    M --> G

    D -->|No| N[New User Registration]
    N --> O[Register Fingerprint + Face]
    O --> P[Generate USER_ID]
    P --> Q[Bind Device]
    Q --> G
```

### Detailed Flow Diagram

```
APP START
    |
    ▼
Splash Screen
    |
    ▼
Fingerprint Scan
    |
    ▼
Check Fingerprint
    |
    |─────────────────────┬──────────────────────┐
    |                     |                      |
    ▼                     ▼                      ▼
Fingerprint Found    Device ID Check      Fingerprint Not Found
    |                     |                   (New User)
    |             ┌───────┴────────┐            |
    |             |                |            ▼
    |             ▼                ▼       TempAccess.tsx
    |         Device Match    Device Mismatch  |
    |             |                |           ▼
    |             ▼                ▼      Register Fingerprint
    |         Face Auth         TempAccess     |
    |             |               Code         ▼
    |             ▼                |       Register Face
    |         ✅ Verified          ▼           |
    |             |            Face Auth       ▼
    |             |                |      Generate ID + Bind
    |             |                ▼            |
    |             |            Device Rebind    ▼
    |             |                |       Dashboard
    |             |                |      (Full Access) ✓
    |             ▼                ▼
    └──────► Dashboard          Dashboard
           (Full Access)      (Restricted)
                ✓              (Temp)
```

## App Current Implementation Status

Your BioVault app is **fully functional** with all core flows implemented and working:

### **Complete User Flow (What's Working Now)**

**THREE MAIN PATHS:**

**PATH 1: Device Match (Existing User with Same Phone)**
- Fingerprint Found → Device Match ✅
- Face Authentication ✅
- Full Dashboard Access ✓

**PATH 2: Device Mismatch (Existing User with Different Phone/Device)**
- Fingerprint Found BUT Device Different ❌
- → TempAccess.tsx: Enter Temporary Code
- → Face Authentication Verify
- → Device Rebind (update binding)
- → Restricted Dashboard (limited access) 

**PATH 3: Fingerprint Not Found (New User)**
- Biometric NOT in system = **Create New Account**
- TempAccess.tsx: Generate Temp Code (as entry point)
- Register Fingerprint + Face
- Generate Unique ID + Device Binding
- Full Dashboard Access ✓

```
┌─────────────────────────────────────────────────────────────────┐
│           BIOVAULT COMPLETE AUTHENTICATION FLOW                 │
└─────────────────────────────────────────────────────────────────┘

                     ┌──────────────────┐
                     │  APP START       │
                     │  Splash Screen   │
                     └────────┬─────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Fingerprint Scan? │
                    └────┬────────────┬──┘
                         │            │
              ┌──────────┴─┐    ┌────┴──────────────┐
              │             │    │                  │
    ┌─────────▼──┐  ┌───────▼─────────┐  ┌────────▼──────────┐
    │ FOUND      │  │ DEVICE ID?      │  │ NOT FOUND         │
    │ (Existing  │  │ (Check Binding) │  │ (New User)        │
    │ User)      │  │                 │  │                   │
    └─────────┬──┘  └───┬──────────┬──┘  └────────┬──────────┘
              │         │          │              │
         MATCH │    MATCH      MISMATCH      └─────▼──────┐
              │         │          │              │       │
    ┌─────────▼──────┐  │  ┌───────▼───┐  ┌──────▼──────┐
    │ Face Auth      │  │  │ RESTRICTED│  │ TempAccess  │
    │ (Login mode)   │  │  │ PATH      │  │ .tsx        │
    └────────┬───────┘  │  │ Need Temp │  │ Generate    │
             │          │  │ Code      │  │ Temp Code   │
    ┌────────▼──────┐   │  └──────┬────┘  └──────┬──────┘
    │ ✅ VERIFIED   │   │         │             │
    └────────┬──────┘   │  ┌──────▼─────┐      │
             │          │  │ Face Auth   │      │
    ┌────────▼──────────┼─▼──(Temp Mode)◄──────┘
    │              │    │  └──────┬─────┘
    │ DASHBOARD    │    │         │
    │ FULL ACCESS  │    │  ┌──────▼──────┐
    │ ✅           │    │  │ Device      │
    │              │    │  │ Rebind      │
    └──────────────┘    │  └──────┬──────┘
                        │         │
                        │  ┌──────▼─────────┐
                        │  │ DASHBOARD      │
                        │  │ RESTRICTED     │
                        │  │ (Temp Access)  │
                        │  └────────────────┘
                        │
                        └─→ FingerprintScanner (Register)
                            ↓
                           FaceScanner (Register)
                            ↓
                           Generate ID + Bind Device
                            ↓
                           DASHBOARD FULL ACCESS ✓
```

## Authentication Flow Logic

### **Three Possible Login Paths**

1. **Device Match (Existing Registered User + Same Phone)**
   - Fingerprint scan → Finds match ✅
   - Device ID check → Device matches ✅
   - Face authentication → Successful ✅
   - **Result: FULL DASHBOARD ACCESS** with all features unlocked

2. **Device Mismatch (Existing Registered User + Different Phone)**
   - Fingerprint scan → Finds match ✅
   - Device ID check → Device doesn't match ❌
   - **Triggers: Temporary Access Flow**
   - Generate temporary code (sent to registered email/message)
   - User enters temp code in TempAccess.tsx
   - Face authentication (to verify identity)
   - Device rebind (update device binding for this phone)
   - **Result: RESTRICTED DASHBOARD** until device is fully trusted

3. **Biometric Not Found (New User)**
   - Fingerprint scan → NOT found in system ❌
   - **Triggers: New User Registration**
   - Generate temporary code (for new user verification)
   - Register fingerprint biometric
   - Register face authentication
   - Generate unique USER_ID
   - Bind device to account
   - **Result: FULL DASHBOARD ACCESS** with new account created

### **backend APIs Working**

```
✅ https://biovault-app.onrender.com (Live & Connected to MongoDB)

POST /api/register ........................... Create/Update user
POST /api/register-fingerprint ............... Store fingerprint credential  
POST /api/register-face ...................... Store face embedding
POST /api/fingerprint/verify ................. Verify fingerprint matches
POST /api/face/verify ........................ Verify face matches
GET  /api/user/check ......................... Check if user exists
POST /api/device/rebind ...................... Update device binding
POST /api/temp-code/request .................. Generate temporary code
POST /api/temp-code/verify ................... Verify temporary code
```

### **What's Implemented & Working**

| Feature | Status | Path | Details |
|---------|--------|------|---------|
| **Fingerprint Scan** | ✅ Complete | Login/Register | Detects if user exists in system |
| **Device Match (Same Phone)** | ✅ Complete | Existing User | Direct to Face Auth + Dashboard |
| **Device Mismatch (Different Phone)** | ✅ Complete | Restricted | Requires Temp Code → Face Auth → Limited Dashboard |
| **Biometric Not Found (New User)** | ✅ Complete | New Registration | Generate Temp Code → Register Biometrics → Generate ID |
| **Face Authentication** | ✅ Complete | Login/Register | Verify face embedding |
| **Temporary Code Generation** | ✅ Complete | Device Mismatch + New User | Entry point for both paths |
| **Temporary Code Verification** | ✅ Complete | Temp Access | Validate code and enable biometrics |
| **Device Binding** | ✅ Complete | Registration | Create/Update device relationship |
| **Device Rebind** | ✅ Complete | Temp Access | Update binding for new device |
| **Dashboard (Full Access)** | ✅ Complete | Login Success | User Profile, Wallet, Images, etc |
| **Dashboard (Restricted)** | ✅ Complete | Temp Access | Limited features for temporary users |
| **Backend APIs** | ✅ Live | All Paths | Render + MongoDB Atlas |

## What Was Changed In This Phase


- `src/pages/Login.tsx`: Updated routing and error handling to match the workflow.
- `src/pages/Index.tsx`: Replaced landing page behavior with splash-driven navigation.
- `src/components/FingerprintScanner.tsx`: Improved biometric fallback behavior and API integration.
- `src/pages/Register.tsx`: Fixed enrollment flow and backend request behavior.
- `android/app/capacitor.build.gradle`: Updated Java/Gradle compatibility settings.
- `android/capacitor-cordova-android-plugins/build.gradle`: Updated Java/Gradle compatibility settings.
- Android debug APK output available at `android/app/build/outputs/apk/debug/app-debug.apk`.

## API Endpoints (Mock Backend)

The mock backend is implemented in `server/index.js`. Default port is `3333` (override with `PORT`).

- `POST /api/register`: body `{ userId, deviceToken, webauthn?, faceEmbedding? }`
- `POST /api/validate`: body `{ userId, deviceToken }` (returns auth result)
- `POST /api/face`: body `{ userId, embedding }`
- `GET /`: health endpoint

By default, the backend stores data in-memory. If `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH` is configured, Firestore can be used.

## Local Run Steps (Web + Backend)

```bash
npm install
```

Set `VITE_API_URL` in `.env` to your machine LAN IP + backend port.
Example: `VITE_API_URL=http://192.168.1.42:3333`

Start backend:

```powershell
npm install --prefix server
npm start --prefix server
```

Start app:

```bash
npm run dev
```

## Android Build and Run

```bash
npm run build
npx cap sync android
npx cap open android
```

From `android` folder:

```powershell
./gradlew assembleDebug
./gradlew installDebug
```

APK path: `android/app/build/outputs/apk/debug/app-debug.apk`

## Notes

- Use LAN IP in `VITE_API_URL` for physical device testing.
- Ensure phone and dev machine are on the same network.
- If install fails from CLI, open Android Studio and run from there.
- Java 17 is expected by the current Android Gradle configuration.
- If `VITE_API_URL` is not set (or points to localhost), the app now runs in local standalone mode. This allows the APK to run on any phone without your local backend.

## Release build & signing

The project now produces a release APK (unsigned) by default. To create a production-signed APK or AAB, follow these steps:

1. Create a release keystore (example using Java `keytool`):

```bash
keytool -genkeypair -v -keystore ~/biovault-release.jks -alias biovault_key -keyalg RSA -keysize 2048 -validity 10000
```

2. Add signing properties to your Gradle properties (either `~/.gradle/gradle.properties` or `android/gradle.properties`):

```
RELEASE_STORE_FILE=/absolute/path/to/biovault-release.jks
RELEASE_STORE_PASSWORD=your_store_password
RELEASE_KEY_ALIAS=biovault_key
RELEASE_KEY_PASSWORD=your_key_password
```

3. Build a signed release APK (from project root):

```bash
cd android
./gradlew assembleRelease
```

If you provided signing properties, Gradle will produce a signed APK at `android/app/build/outputs/apk/release/app-release.apk`. If signing properties are not present you will get an unsigned APK at `android/app/build/outputs/apk/release/app-release-unsigned.apk` which you can sign manually with `apksigner`.

Manual signing example (if you kept unsigned APK):

```bash
# sign
apksigner sign --ks ~/biovault-release.jks --out app-release-signed.apk app-release-unsigned.apk
# verify
apksigner verify app-release-signed.apk
```

Notes:
- The app enforces TLS by default (cleartext disabled). If you need temporary cleartext access to specific development endpoints, add a domain-config entry to `android/app/src/main/res/xml/network_security_config.xml`.
- User data in standalone mode is stored per-device in local storage; to share accounts across devices deploy a remote backend and set `VITE_API_URL` to its URL.
