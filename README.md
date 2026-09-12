# PINIT Vault - Secure Document Management System

## Overview

PINIT Vault is a secure biometric authentication system for document management with advanced crypto features. The app provides multi-layered security through fingerprint and facial recognition, combined with encrypted storage and sharing capabilities.

## App Flow

### 1. Application Start
```
APP START
│
▼
Splash Screen (Index.tsx)
├── Shield Logo Animation
├── "PINIT VAULT" Title
├── "Securing access with capture" Subtitle
└── Hexagonal Grid Background
```

### 2. Three-Tier Routing System
The app implements an intelligent routing system that checks user state in three tiers:

#### Tier 1: Session Validation
- **Check**: Valid session token exists and is not expired
- **If Valid**: Navigate to Dashboard
- **If Expired**: Attempt token refresh
- **If Refresh Fails**: Fall to Tier 2

#### Tier 2: User Registration Check
- **Check**: User exists in system (userId present)
- **If Registered**: Navigate to Login
- **If Not Registered**: Navigate to BiometricOptions

#### Tier 3: New User Flow
- **Action**: Navigate to Login for fresh registration
- **Path**: Login → BiometricOptions → Register

### 3. Authentication Flow

#### Login Page (Login.tsx)
```
LOGIN PAGE
│
├── Fingerprint Authentication
│   ├── Native Device Scanner
│   ├── Backend Verification
│   └── Success → Face Authentication
│
├── Face Authentication
│   ├── Camera Access
│   ├── Face Recognition
│   └── Success → Dashboard
│
└── Error Handling
    ├── Sensor Not Available
    ├── Authentication Failed
    └── Registration Required
```

#### Registration Page (Register.tsx)
```
REGISTRATION PAGE
│
├── User Information Form
│   ├── Name
│   ├── Email
│   └── Phone
│
├── Biometric Setup
│   ├── Fingerprint Registration
│   ├── Face Registration
│   └── Backup Methods
│
└── Account Creation
    ├── Backend Integration
    └── Session Token Generation
```

### 4. Main Application Interface

#### Dashboard (Dashboard.tsx)
```
DASHBOARD
│
├── Document Management
│   ├── Upload Documents
│   ├── Scan Documents
│   └── Document Review
│
├── Vault Access
│   ├── Encrypted Storage
│   ├── File Organization
│   └── Search & Filter
│
├── Profile Management
│   ├── Advanced Profile
│   ├── Modern Profile
│   └── Settings
│
└── Portfolio Features
    ├── Portfolio Home
    ├── Portfolio Builder
    └── Share Capabilities
```

## Pages & Components

### Core Pages
1. **Index.tsx** - Splash screen with routing logic
2. **Login.tsx** - Biometric authentication (fingerprint + face)
3. **Register.tsx** - User registration with biometric setup
4. **Dashboard.tsx** - Main application interface
5. **DocumentHub.tsx** - Document management center
6. **VaultPage.tsx** - Secure vault access
7. **ProfileAdvanced.tsx** - Advanced user profile
8. **ProfileModern.tsx** - Modern profile interface
9. **UploadPage.tsx** - Document upload functionality
10. **ScanDocumentFlow.tsx** - Document scanning workflow
11. **ReviewPage.tsx** - Document review and editing
12. **UploadFromDevice.tsx** - Device file upload
13. **TempAccess.tsx** - Temporary access features
14. **TempAccessFace.tsx** - Face-based temporary access
15. **BiometricOptions.tsx** - Biometric setup options

### Portfolio Pages
1. **PortfolioHome.tsx** - Portfolio overview
2. **ChoosePortfolioType.tsx** - Portfolio type selection
3. **PortfolioBuilder.tsx** - Portfolio creation tool

### Key Components

#### Authentication Components
- **FingerprintScanner.tsx** - Fingerprint authentication
- **FaceScanner.tsx** - Face recognition
- **BiometricInitializer.tsx** - Biometric system initialization
- **ProtectedRoute.tsx** - Route protection

#### UI Components
- **HexGrid.tsx** - Animated hexagonal background
- **StatusIndicator.tsx** - Status display components
- **SharedImageViewer.tsx** - Image viewing and sharing

## Features

### Security Features
- **Multi-Factor Authentication**: Fingerprint + Face recognition
- **Encrypted Storage**: AES-256 encryption for documents
- **Session Management**: Secure token-based sessions
- **Biometric Verification**: Native device biometrics
- **Access Control**: Role-based permissions

### Document Management
- **Document Upload**: Multiple file formats supported
- **Document Scanning**: Camera-based document capture
- **Document Review**: Edit and annotate documents
- **File Organization**: Folder structure and tagging
- **Search & Filter**: Advanced document search
- **Sharing Capabilities**: Secure document sharing

### Crypto Features
- **End-to-End Encryption**: Client-side encryption
- **Key Management**: Secure key generation and storage
- **Hash Verification**: Document integrity verification
- **Secure Sharing**: Encrypted file sharing

### Portfolio Features
- **Portfolio Creation**: Build professional portfolios
- **Custom Templates**: Multiple portfolio types
- **Media Integration**: Images and videos
- **Export Options**: Multiple format exports

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation

### Mobile Framework
- **Capacitor** - Cross-platform mobile development
- **Capacitor Plugins**:
  - @capacitor/camera - Camera access
  - @capacitor/device - Device information
  - @capacitor/filesystem - File storage
  - @capacitor/preferences - Local preferences
  - @capacitor/share - Sharing capabilities
  - @capgo/capacitor-native-biometric - Biometric authentication

### Backend Integration
- **REST API** - Backend communication
- **JWT Authentication** - Secure token-based auth
- **Render Deployment** - Cloud backend hosting

## Development Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Android Studio (for Android development)
- Capacitor CLI

### Installation
```bash
# Clone repository
git clone <repository-url>
cd secure-sweet-access-main

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Sync to Android
npx cap sync android

# Build Android APK
cd android
./gradlew.bat assembleDebug

# Install on device
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Environment Variables
Create `.env` file with:
```env
VITE_API_URL=https://your-backend-url.com
VITE_BACKEND_URL=https://your-backend-url.com
VITE_PUBLIC_URL=https://your-app-url.com
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Application pages
├── lib/                # Utility libraries
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitions
├── assets/             # Static assets
└── styles/             # Global styles

android/
├── app/
│   ├── src/main/       # Android app source
│   └── build/outputs/  # Build outputs
└── gradle/             # Gradle configuration
```

## Deployment

### Android Deployment
1. **Build Application**: `npm run build`
2. **Sync Assets**: `npx cap sync android`
3. **Compile APK**: `./gradlew.bat assembleDebug`
4. **Install Device**: `adb install <apk-path>`

### Production Build
```bash
# Release build
npm run build
npx cap sync android
cd android
./gradlew.bat assembleRelease
```

## Troubleshooting

### Common Issues

#### Black Screen
- **Cause**: WebView not loading HTML or React failing to mount
- **Solution**: Check Capacitor configuration and web assets
- **Debug**: Use Chrome DevTools for WebView debugging

#### Biometric Issues
- **Cause**: Device biometrics not configured
- **Solution**: Enable biometrics in device settings
- **Debug**: Check biometric permissions

#### Network Issues
- **Cause**: Backend connectivity problems
- **Solution**: Check API endpoints and network configuration
- **Debug**: Use network debugging tools

### Debugging
```bash
# View Android logs
adb logcat | findstr biovault

# Chrome DevTools
# Enable in MainActivity.java
WebView.setWebContentsDebuggingEnabled(true);
```

## Security Considerations

### Data Protection
- All sensitive data encrypted at rest
- Biometric data stored securely
- Session tokens have expiration
- API communications use HTTPS

### Access Control
- Multi-factor authentication required
- Role-based permissions
- Audit logging for access
- Session timeout management

## Contributing

1. Follow existing code patterns
2. Maintain TypeScript type safety
3. Test biometric flows thoroughly
4. Ensure mobile responsiveness
5. Document new features

## License

© 2024 PINIT Vault. All rights reserved.

---

**Last Updated**: May 2025
**Version**: 1.0.0
**Framework**: React + Capacitor
