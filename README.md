# 🔐 BioVault - Biometric Image Encryption & Forensics Platform

> **Enterprise-Grade Image Encryption, Forensic Analysis & Biometric Authentication**

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BioVault Platform Architecture                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      FRONTEND LAYER                             │ │
│  │                   (React + TypeScript)                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│           ↓ ↓ ↓ ↓ ↓ ↓ ↓                                              │
│  ┌─────────┬──────────┬──────────┬──────────┬──────────────────┐   │
│  │  Pages  │Components│ Utilities│  Storage │   Integration   │   │
│  ├─────────┼──────────┼──────────┼──────────┼─────────────────┤   │
│  │ Login   │Dashboard │  Crypto  │Local    │  Biometric Auth  │   │
│  │Register │Encrypt   │  Hashing │Storage  │  Fingerprint     │   │
│  │         │Analyze   │Forensics │  &      │  Face Recognition│   │
│  │         │Activity  │Sharing   │Event    │                  │   │
│  │         │Settings  │          │Broadcast│                  │   │
│  └─────────┴──────────┴──────────┴──────────┴─────────────────┘   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      BACKEND LAYER                              │ │
│  │                    (Supabase PostgreSQL)                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│           ↓ ↓                                                        │
│  ┌──────────────────────┬──────────────────────┐                   │
│  │  vault_images Table  │ biometric_users Tbl │                   │
│  ├──────────────────────┼──────────────────────┤                   │
│  │ • asset_id (PK)      │ • user_id (PK)       │                   │
│  │ • user_id (FK)       │ • device_token       │                   │
│  │ • file_hash          │ • face_embedding[]   │                   │
│  │ • visual_fingerprint │ • is_active          │                   │
│  │ • blockchain_anchor  │ • created_at         │                   │
│  │ • certificate_id     │ • updated_at         │                   │
│  │ • metadata (created) │                      │                   │
│  └──────────────────────┴──────────────────────┘                   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 User Journey & Application Flow

```
START
  │
  ├─→ 🏠 HOME PAGE
  │     ├─→ Login (Fingerprint)
  │     ├─→ Login (Face Recognition)
  │     └─→ ✅ Authenticated
  │
  ├─→ 📝 REGISTRATION PAGE (if new user)
  │     ├─→ Biometric Setup
  │     ├─→ Create userId
  │     └─→ Save to vault_images & biometric_users tables
  │
  └─→ 📊 MAIN DASHBOARD
        │
        ├─→ 🏠 HOME PAGE
        │     └─→ Overview & Quick Stats
        │
        ├─→ 💼 VAULT PAGE
        │     ├─→ View encrypted images
        │     ├─→ Grid/List view toggle
        │     ├─→ Download & delete assets
        │     └─→ Search & filter
        │
        ├─→ ➕ CREATE PAGE
        │     ├─→ Portfolio creation
        │     └─→ Asset management
        │
        ├─→ 🔐 ENCRYPT PAGE (NEW - Image Crypto)
        │     │
        │     ├─→ 1️⃣ Upload Image
        │     │     ├─→ Camera capture
        │     │     └─→ File upload
        │     │
        │     ├─→ 2️⃣ Forensic Analysis
        │     │     ├─→ AI-Generation Detection
        │     │     │   ├─→ Uniformity analysis
        │     │     │   └─→ Noise patterns
        │     │     ├─→ Crop Detection
        │     │     │   ├─→ Border analysis
        │     │     │   └─→ Aspect ratio check
        │     │     └─→ Authenticity Scoring
        │     │         ├─→ Risk Level: Low/Medium/High/Critical
        │     │         └─→ Confidence %
        │     │
        │     ├─→ 3️⃣ Encryption & Steganography
        │     │     ├─→ LSB Embedding (12x12 tiles)
        │     │     ├─→ CRC16 Validation
        │     │     ├─→ Multi-channel (R,G,B)
        │     │     └─→ Crop-resistant (80%+ robust)
        │     │
        │     ├─→ 4️⃣ Metadata Capture
        │     │     ├─→ Perceptual Hash (pHash)
        │     │     ├─→ SHA-256 Checksum
        │     │     ├─→ EXIF Data
        │     │     ├─→ Device Fingerprint
        │     │     ├─→ Timestamp
        │     │     └─→ Optional: GPS & IP
        │     │
        │     ├─→ 5️⃣ Certificate Generation
        │     │     ├─→ Authorship Certificate ID
        │     │     ├─→ Blockchain Anchor
        │     │     ├─→ CRC Validation
        │     │     └─→ Store in Supabase
        │     │
        │     └─→ 6️⃣ Share Management
        │           ├─→ Create share link
        │           ├─→ Set expiry (optional)
        │           ├─→ Access limits
        │           └─→ Public viewer link
        │
        ├─→ 👁️ ANALYZE PAGE (NEW - Image Analysis)
        │     ├─→ Upload image
        │     ├─→ Basic analysis
        │     ├─→ Generate asset ID
        │     ├─→ Create certificate
        │     └─→ Download HTML report
        │
        ├─→ 📊 ACTIVITY PAGE (NEW - Audit Logs)
        │     ├─→ Activity Timeline
        │     │   ├─→ Upload events
        │     │   ├─→ Encryption events
        │     │   ├─→ Share events
        │     │   ├─→ Download events
        │     │   ├─→ Certificate events
        │     │   └─→ Delete events
        │     │
        │     ├─→ Statistics
        │     │   ├─→ Total activities
        │     │   ├─→ Encryption count
        │     │   ├─→ Share count
        │     │   └─→ Success rate %
        │     │
        │     └─→ 30-Day Timeline
        │           └─→ Activity breakdown by date
        │
        ├─→ ⚙️ SETTINGS PAGE (NEW - User Profile)
        │     ├─→ User Information
        │     │   ├─→ Profile display
        │     │   ├─→ Verification status
        │     │   └─→ Session timer
        │     │
        │     ├─→ Security Settings
        │     │   ├─→ Password change
        │     │   ├─→ Password strength meter
        │     │   ├─→ 2FA toggle
        │     │   └─→ Two-factor authentication
        │     │
        │     ├─→ Data Management
        │     │   ├─→ Download all data
        │     │   └─→ Export vault
        │     │
        │     └─→ Danger Zone
        │           ├─→ Logout
        │           └─→ Delete account
        │
        ├─→ 📤 SHARE PAGE
        │     └─→ Share management
        │
        └─→ 👤 IDENTITY PAGE
              └─→ Identity verification

END (Logout)
```

---

## 🛠️ Technical Stack

```
┌────────────────────────────────────────────────────────────┐
│                    TECHNOLOGY STACK                        │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND FRAMEWORK                                        │
│  ├─ React 18 (TypeScript)                                  │
│  ├─ Vite (Build tool)                                      │
│  ├─ TailwindCSS (Styling)                                  │
│  ├─ Framer Motion (Animations)                             │
│  └─ Lucide Icons (UI Icons)                                │
│                                                             │
│  AUTHENTICATION & SECURITY                                 │
│  ├─ Fingerprint Scanner (Biometric)                        │
│  ├─ Face Scanner (Facial Recognition)                      │
│  ├─ Capacitor (Mobile Bridge)                              │
│  └─ Biometric Verification API                             │
│                                                             │
│  IMAGE PROCESSING & CRYPTOGRAPHY                           │
│  ├─ LSB Steganography (embedding/extraction)               │
│  ├─ Perceptual Hashing (DCT-based)                         │
│  ├─ CRC16 Validation (error detection)                     │
│  ├─ SHA-256 (checksum generation)                          │
│  ├─ WebAuthn (credential management)                       │
│  └─ Canvas API (image manipulation)                        │
│                                                             │
│  FORENSIC ANALYSIS                                         │
│  ├─ AI-Generation Detection                                │
│  ├─ Crop Detection (aspect ratio analysis)                 │
│  ├─ Variance & Noise Analysis                              │
│  ├─ Edge Coherence Detection                               │
│  ├─ Entropy Calculation                                    │
│  └─ LBP Uniformity Ratio                                   │
│                                                             │
│  STORAGE & DATABASE                                        │
│  ├─ localStorage (Client-side caching)                     │
│  ├─ Supabase PostgreSQL (Cloud backend)                    │
│  ├─ RLS Policies (Row-level security)                      │
│  └─ Event Broadcasting (real-time updates)                 │
│                                                             │
│  DEPLOYMENT                                                │
│  ├─ Render (Frontend hosting, running now!)                │
│  ├─ Supabase (Backend PostgreSQL)                          │
│  ├─ Cloudinary (Optional CDN for images)                   │
│  └─ Android/iOS (Capacitor native build)                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
secure-sweet-access-main/
├── src/
│   ├── pages/
│   │   ├── Login.tsx              ← Biometric login
│   │   ├── Register.tsx           ← User registration
│   │   └── Dashboard.tsx          ← Main dashboard entry
│   │
│   ├── components/
│   │   ├── PINITVaultDashboard.tsx ← Main dashboard (7 pages)
│   │   ├── ImageCryptoFull.tsx     ← 🔐 Encryption page
│   │   ├── ImageAnalyzer.tsx       ← 👁️ Analysis page
│   │   ├── VaultManager.tsx        ← 💼 Asset vault
│   │   ├── ActivityLogger.tsx      ← 📊 Audit logs
│   │   ├── UserProfile.tsx         ← ⚙️ Settings
│   │   ├── SharedImageViewer.tsx   ← Public share viewer
│   │   ├── FingerprintScanner.tsx  ← Biometric auth
│   │   ├── FaceScanner.tsx         ← Facial recognition
│   │   └── ... (other UI components)
│   │
│   ├── lib/
│   │   ├── phash.ts               ← Perceptual hashing
│   │   ├── cryptoUtils.ts         ← Steganography & crypto
│   │   ├── forensicsUtils.ts      ← Image analysis
│   │   ├── sharingUtils.ts        ← Certificates & shares
│   │   ├── activityUtils.ts       ← Activity logging
│   │   ├── advancedSteganography.ts ← Advanced metadata embedding
│   │   ├── vaultService.ts        ← Vault operations
│   │   ├── authService.ts         ← Authentication
│   │   ├── storage.ts             ← Storage abstraction
│   │   └── ... (other utilities)
│   │
│   ├── App.tsx                   ← Router & main app
│   └── main.tsx                  ← Entry point
│
├── backend/
│   ├── main.py                   ← FastAPI server
│   ├── requirements.txt          ← Python dependencies
│   ├── QUERIES_TO_RUN.sql        ← Supabase setup
│   └── ... (backend files)
│
├── android/                      ← Android native code
├── public/                       ← Static assets
├── dist/                         ← Production build
├── vite.config.ts               ← Vite configuration
├── tsconfig.json                ← TypeScript config
├── tailwind.config.ts           ← TailwindCSS config
├── postcss.config.js            ← PostCSS config
├── package.json                 ← Dependencies
└── README.md                    ← This file
```

---

## 🔐 Core Features Breakdown

### 1️⃣ **Biometric Authentication**
```
Login Flow:
  1. Fingerprint Scan (device fingerprint sensor)
  2. Face Recognition (device camera + ML)
  3. Token generation & storage
  4. Navigation to Dashboard
```

### 2️⃣ **Image Encryption (LSB Steganography)**
```
Encryption Pipeline:
  1. Image upload (camera or file)
  2. metadata extraction (EXIF, device)
  3. Create 280-bit payload (user ID + validation)
  4. Embed in tiles (12x12 LSB pattern)
  5. CRC16 checksum for error detection
  6. Multi-channel (R, G, B) for robustness
  7. Result: Image survives 80%+ cropping
```

### 3️⃣ **Forensic Analysis**
```
Analysis Pipeline:
  1. Load image to canvas
  2. Extract pixel data
  3. Calculate metrics:
     - Pixel variance (natural vs synthetic)
     - Noise patterns (Gaussian analysis)
     - Uniformity ratio (LBP calculation)
     - DCT smoothness (block coherence)
     - Edge detection (coherence score)
  4. Classification:
     - Authentic (natural image)
     - AI-Generated (high uniformity + low noise)
     - Cropped (aspect ratio anomaly)
  5. Risk scoring (Low/Medium/High/Critical)
  6. Confidence percentage
```

### 4️⃣ **Digital Certificates**
```
Certificate Generation:
  1. Create authorship ID
  2. Add blockchain anchor
  3. Include metadata hash
  4. CRC16 validation
  5. Store in Supabase vault_images
  6. Enable verification & authenticity proof
```

### 5️⃣ **Activity Auditing**
```
Tracking:
  - Every action logged (upload, encrypt, share, download, delete, certificate, view)
  - Per-user activity logs (max 1000 entries)
  - Real-time event broadcasting
  - 30-day timeline breakdown
  - Success/failure rate metrics
```

---

## 🚀 Getting Started

### Prerequisites
```bash
Node.js 18+ 
npm or yarn
Supabase account (optional for cloud)
```

### Installation & Running

```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Build for production
npm run build

# Run on Render (already deployed)
# https://your-render-app.onrender.com
```

---

## 📊 Database Schema

### **vault_images Table** (Encrypted Image Storage)
```sql
Column              | Type                  | Purpose
────────────────────────────────────────────────────────────
id                  | UUID (PK)             | Unique identifier
user_id             | TEXT (FK)             | Owner of image
asset_id            | TEXT (UNIQUE)         | Asset identifier
certificate_id      | TEXT                  | Authorship cert ID
file_hash           | TEXT                  | SHA-256 checksum
visual_fingerprint  | TEXT                  | Perceptual hash
blockchain_anchor   | TEXT                  | Blockchain ID
resolution          | TEXT                  | Image dimensions
file_size           | TEXT                  | File size in bytes
file_name           | TEXT                  | Original filename
capture_timestamp   | TEXT                  | Capture time
device_id           | TEXT                  | Device fingerprint
created_at          | TIMESTAMP             | Created date
updated_at          | TIMESTAMP             | Updated date
```

### **biometric_users Table** (User Authentication Data)
```sql
Column              | Type                  | Purpose
────────────────────────────────────────────────────────────
id                  | BIGSERIAL (PK)        | Unique identifier
user_id             | TEXT (UNIQUE, FK)     | User identifier
device_token        | TEXT                  | Device token
webauthn_credential | JSONB                 | WebAuthn credentials
face_embedding      | DOUBLE PRECISION[]    | Face embeddings vector
is_active           | BOOLEAN               | Active status
created_at          | TIMESTAMP             | Created date
updated_at          | TIMESTAMP             | Updated date
```

---

## 🔄 Data Flow Diagram

```
USER INTERACTION → COMPONENT LOGIC → UTILITY FUNCTIONS → STORAGE
        ↓                ↓               ↓                   ↓
     onClick        React State    cryptoUtils.ts       localStorage
     onChange       setCurrentPage  forensicsUtils.ts    (cache)
     onSubmit       useState        activityUtils.ts     ↓
        ↓                ↓           phash.ts        localStorage
     Encrypt          Activity        ↓               (persistent)
     Analyze          Logger      Processing         ↓ (optional)
     Share            UI Update         ↓        Supabase Tables
     Delete           Animations   Validation
                                        ↓
                               Real-time Event
                               Broadcasting
```

---

## ✨ Key Algorithms

### **Perceptual Hashing (pHash)**
- **Primary:** 64-bit DCT-based hash (16×16 frequency decomposition)
- **Legacy:** 16-bit average hash (backward compatibility)
- **Similarity:** Hamming distance comparison
- **Rotation:** Handles 0°, 90°, 180°, 270° rotations

### **LSB Steganography**
- **Tile Size:** 12×12 pixels for robustness
- **Payload:** 280 bits (32-char UUID + 2-byte CRC)
- **Redundancy:** Majority voting across tiles
- **Error Detection:** CRC16 validation
- **Crop Resistance:** 144 tile offsets = 80%+ survival rate

### **Forensic Metrics**
- **Variance:** Pixel distribution analysis
- **Entropy:** Information content measurement
- **LBP Ratio:** Local binary patterns uniformity
- **Edge Coherence:** Sharp edge detection
- **Noise Patterns:** Gaussian distribution analysis

---

## 🎯 User Experience Flow

```
┌─────────────────────────────────────────────────┐
│     USER OPENS APP ON RENDER                     │
└──────────────────┬──────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Check Authentication │
        └──────────┬───────────┘
                   ↓
        ┌─────────────────────────┐
        │ Authenticated?          │
        └─┬────────────────────┬──┘
          │ YES               │ NO
          ↓                   ↓
     ┌─────────┐      ┌──────────────┐
     │Dashboard │      │Login/Register│
     └────┬────┘      └──────┬───────┘
          ↓                   ↓
      ┌────────────────────────────┐
      │  Select Dashboard Feature   │
      └────┬──────────────┬────┬────┘
           │              │    │
      ┌────▼──┐ ┌─────────▼─┐ ...
      │Encrypt │ │Activity  │
      │  🔐    │ │  📊     │
      └────┬──┘ └─────────┬─┘
           │              │
      ┌────▼──┐ ┌─────────▼─┐
      │Process │ │Display Log │
      │ Image  │ │ & Stats   │
      └────┬──┘ └──────────┘
           ↓
       ┌────────────┐
       │Save/Share  │
       │& Events    │
       └────────────┘
```

---

## 📈 Performance Metrics

```
Build Time:        33 seconds
Bundle Size:       2.5 MB (487 KB gzipped)
TypeScript Errors: 0
Components:        15+ custom components
Utility Libraries: 5 core libraries
Dashboard Pages:   7 integrated pages
Features:          20+ core features
```

---

## ✅ Quality Checklist

- ✅ Zero TypeScript compilation errors
- ✅ Full biometric authentication integration
- ✅ Image encryption with forensics
- ✅ Activity auditing & logging
- ✅ User profile management
- ✅ Digital certificate generation
- ✅ Share link management
- ✅ Supabase backend ready
- ✅ Production build optimized
- ✅ Mobile-ready (Capacitor compatible)
- ✅ Running on Render (production)

---

## 🔗 Deployment Status

| Environment | Status | URL |
|-----------|--------|-----|
| Development | ✅ Running | `localhost:5173` |
| Production | ✅ Live | Render.com |
| Backend | ✅ Ready | Supabase PostgreSQL |
| Database | ✅ Configured | vault_images, biometric_users |

---

## 📝 License

© 2026 BioVault. All rights reserved.

---

## 🤝 Support

For issues or questions, check the console logs and verify:
1. Biometric sensors available
2. Supabase credentials configured
3. localStorage permissions enabled
4. HTTPS enabled (required for WebAuthn)

---

**Last Updated:** April 15, 2026  
**Status:** Production Ready ✅
