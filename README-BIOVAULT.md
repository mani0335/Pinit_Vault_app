Biovault local backend and biometric flow

Quick start (development)

1. Start mock backend server (for registration and validation)

```bash
cd server
npm install
npm start
```

Server runs at http://localhost:3333

2. Run the web app (Vite)

```bash
cd secure-sweet-access-main
npm install
npm run dev
```

3. Build and run on Android (Capacitor)

```bash
# build web assets
npm run build
# copy + sync to android
cd ..
npx cap copy android
npx cap sync android
npx cap open android
```

Notes

- Registration: complete the registration flow in the app. On the final "Store & Verify" step the app will register the `userId` and a device token with the mock backend. This stores a mapping so login can be validated.
- Login: when performing biometric login the app will trigger the device biometric prompt (native plugin or WebAuthn). After successful biometric the app will call `/api/validate` with the stored `userId` and device token. The backend checks that the user exists, device matches and biometric is enabled.
- Security: raw fingerprint/face data is never sent to the server. Only the device token and `userId` are used for backend validation.

If you want, I can add a real persistence layer (JSON file) or expand the API to show admin endpoints for listing users.

Plugin setup (native biometric)

This project supports a native biometric fallback using the `cordova-plugin-fingerprint-aio` plugin (works with Capacitor). Install and sync before opening Android Studio:

```bash
# from project root
npm install cordova-plugin-fingerprint-aio --save
npx cap sync android
```

After syncing, open Android Studio and run on a device. The app will show the native biometric prompt when WebAuthn is unavailable.
