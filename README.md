<<<<<<< HEAD
# Biovault_App
# Biovault_App

## Project info

This repository contains the Biovault mobile/web app — a biometric vault demo built with Vite + React + TypeScript and packaged with Capacitor for Android.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed.

Follow these steps:

```sh
# Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Install the necessary dependencies.
npm i

# Start the development server with auto-reloading and an instant preview.
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## App Flow

Below is the high-level app flow for the biometric vault application:

APP START
	│
	▼
Splash Screen
	│
	▼
Fingerprint Scan
	│
	▼
Check Fingerprint
	│
	├───────────────► Fingerprint Found
	│                      │
	│                      ▼
	│               Device ID Check
	│                      │
	│         ┌────────────┴────────────┐
	│         │                         │
	│         ▼                         ▼
	│   Device Match            Device Mismatch
	│         │                         │
	│         ▼                         ▼
	│  Face Authentication      Temporary Access
	│         │                         │
	│         ▼                         ▼
	│   Vault Dashboard        Enter Temporary Code
	│                                   │
	│                                   ▼
	│                          Code Verification
	│                                   │
	│                                   ▼
	│                         Register Biometrics
	│                                   │
	│                                   ▼
	│                           Update Device ID
	│                                   │
	│                                   ▼
	│                           Login Again
	│                                   │
	│                                   ▼
	│                           Vault Dashboard
	│
	└──────────────► Fingerprint  Not Found
		                          │
		                          ▼
		                  New User Registration
		                          │
		                          ▼
		                 Register Fingerprint + Face
		                          │
		                          ▼
					Generate USER_ID
		                          │
		                          ▼
					Bind Device
		                          │
		                          ▼
					Vault Dashboard

## What I Changed

Below is a concise summary of code and project changes made while implementing the biometric vault flow, building the Android app, and wiring up a mock backend for testing.

- **Files Modified**:
  - `src/pages/Login.tsx` — updated routing and error handling to follow the App Flow.
  - `src/pages/Index.tsx` — replaced landing page with an auto-navigating splash.
  - `src/components/FingerprintScanner.tsx` — improved biometric fallback, fetch error handling, and server calls.
  - `src/pages/Register.tsx` — enrollment and API call fixes.
  - Android Gradle files updated for Java compatibility: `android/app/capacitor.build.gradle`, `android/capacitor-cordova-android-plugins/build.gradle`.
  - Debug/packaging: debug APK available at `android/app/build/outputs/apk/debug/app-debug.apk`.

## API Endpoints (mock backend)

The project includes a simple mock Express backend at `server/index.js`. Default listen port is `3333` (can be overridden with `PORT`). Endpoints:

- **POST /api/register** — body: `{ userId, deviceToken, webauthn?, faceEmbedding? }`.
- **POST /api/validate** — body: `{ userId, deviceToken }`. Returns `{ authorized: true }` or `403` with `reason`.
- **POST /api/face** — body: `{ userId, embedding }`.
- **GET /** — health/status endpoint.

The mock server uses an in-memory Map by default. If Firebase Admin credentials are provided via `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH` environment variables, Firestore will be used.

## How to run locally (web + backend)

- Install dependencies: `npm i`.
- Set API URL for client: edit `.env` and set `VITE_API_URL` to your PC LAN IP + port (example: `VITE_API_URL=http://192.168.1.42:3333`).
- Start mock backend:

```powershell
# from repo root
npm start --prefix secure-sweet-access-main/server
```

- Run dev web app:

```bash
npm run dev
```

## Android (Capacitor) — build & run on device

- Sync web assets to Android (after building):

```bash
npx cap sync android
```

- Open Android Studio:

```bash
cd secure-sweet-access-main
npx cap open android
```

- Build & install via Gradle (requires `adb` and a connected device):

```powershell
cd android
./gradlew assembleDebug
./gradlew installDebug
```

- APK path: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Notes & Troubleshooting

- Backend port: server default port is `3333`. If you used `5000`, update `.env` or start the server with `PORT=5000 npm start`.
- Phone cannot reach backend: ensure phone and PC are on same Wi‑Fi and `VITE_API_URL` uses PC LAN IP (not `localhost`).
- ADB / device issues: open `android` in Android Studio if `gradlew installDebug` fails.
- Java / Gradle compatibility: Gradle files were adjusted to target Java 17; update if your JDK differs.

---
If you want the exact debug command log (kill port, start server, build APK) added, tell me and I'll append it.
					- **Sync web assets to Android** (after building or `npm run build`):
