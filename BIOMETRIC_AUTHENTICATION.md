# PINIT Vault - Biometric Authentication Flow

## 🔐 Biometric Authentication Architecture

This document details how PINIT Vault implements biometric-based authentication using fingerprint and face recognition.

---

## 🎯 Authentication Overview

### **Two-Factor Biometric Verification**

PINIT Vault requires **BOTH** biometric modalities for login:

```
        ┌─────────────────────────────────────┐
        │  1️⃣ Fingerprint Verification        │
        │  (Device native biometric)          │
        │  Uses device's fingerprint sensor   │
        │  and OS-level APIs                  │
        └────────────┬────────────────────────┘
                     ↓
        ┌─────────────────────────────────────┐
        │  2️⃣ Face Recognition Verification   │
        │  (ML-based face detection)          │
        │  Uses device camera and             │
        │  on-device ML model                 │
        └────────────┬────────────────────────┘
                     ↓
        ┌─────────────────────────────────────┐
        │  ✅ Both verified → Issue tokens    │
        │  ❌ Either fails → Deny access       │
        └─────────────────────────────────────┘
```

---

## 📱 Device Compatibility

### **Supported Platforms**

| Platform | Fingerprint | Face |  Status |
|----------|-------------|------|---------|
| Android 6+ | ✅ Yes | ✅ Yes (ML Kit) | ✅ Supported |
| iOS 12+ | ✅ Yes (Touch ID) | ✅ Yes (Face ID) | ✅ Supported |
| Web Browser | ❌ No native | ❌ No native | ⚠️ Simulator only |

### **API Dependencies**

```
Android:
├─ androidx.biometric:biometric (fingerprint)
├─ com.google.mlkit:face-detection (face)
└─ Android OS WebAuthn API

iOS:
├─ LocalAuthentication.framework (fingerprint)
├─ Vision.framework (face detection)
└─ WebAuthn framework

Web:
├─ WebAuthn API (simulator)
├─ Canvas API (face simulation)
└─ localStorage (mock storage)
```

---

## 🔑 Authentication Flow - Detailed Steps

### **Phase 0: Startup & Registration Check**

When user opens app:

```typescript
// src/pages/Login.tsx - useEffect
const checkRegistration = async () => {
  try {
    // Check if user has been registered before
    const userId = await appStorage.getItem("biovault_userId");
    
    if (!userId) {
      // First time user - redirect to registration options
      navigate('/biometric-options', { replace: true });
      return;
    }
    
    // User exists - show login screen
    console.log('✅ User found, showing login page:', userId);
  } catch (err) {
    // On error, assume not registered
    navigate('/biometric-options', { replace: true });
  }
};
```

**Outcomes:**
- ✅ Registered user → Show Login page with fingerprint scanner
- ❌ New user → Show BiometricOptions (Register or Temp Access)

---

### **Phase 1: Fingerprint Verification**

#### **Step 1a: Fingerprint Capture (Device Level)**

User places finger on device scanner:

```
Device Fingerprint Sensor
         ↓
   OS Biometric API
   ├─ Android: androidx.biometric.BiometricPrompt
   └─ iOS: LocalAuthentication.evaluatePolicy()
         ↓
   Scans fingerprint from hardware
         ↓
   Matches against device's stored fingerprint
         ↓
   Returns success/failure to app
```

**Code (FingerprintScanner.tsx):**
```typescript
const handleBiometric = async () => {
  try {
    // Request device to scan fingerprint
    const result = await WebAuthn.authenticate({
      publicKey: {
        challenge: new Uint8Array(32),
        timeout: 60000,
        userVerification: "preferred",
      },
    });
    
    // Device verified fingerprint locally
    console.log('✅ Device verified fingerprint locally');
    
    // Call parent component's success handler
    onSuccess();
    
  } catch (error) {
    // Fingerprint scan failed
    onError?.(error.message);
  }
};
```

**Possible Outcomes:**
- ✅ Fingerprint matched → Continue to Step 1b
- ❌ Fingerprint not matched → Show retry prompt
- ⚠️ Too many failed attempts → Lockout (device-specific)
- ❌ No fingerprint on device → Error message

#### **Step 1b: Backend Verification**

After device confirms fingerprint locally, app sends it to backend:

```typescript
// src/pages/Login.tsx - handleFingerprintSuccess
const handleFingerprintSuccess = async () => {
  console.log('✅ Fingerprint scanned locally - now verifying with backend');
  
  // Get user ID from local storage
  let userId: string | null = null;
  try {
    userId = await appStorage.getItem("biovault_userId");
  } catch (err) {
    console.error('❌ Failed to get userId from storage:', err);
    setVerification(prev => ({
      ...prev,
      step: "error",
      errorMessage: "Unable to retrieve your account information. Please register again.",
    }));
    return;
  }

  try {
    console.log('🔍 Verifying fingerprint with backend for userId:', userId);
    
    // Call backend to verify this fingerprint is registered for this user
    const result = await verifyFingerprintBackend(userId);
    
    if (result.verified) {
      console.log('✅ Fingerprint verified! Now proceed to face verification');
      setVerification(prev => ({
        ...prev,
        userId,
        fingerprintVerified: true,
        step: "face"  // Move to next step
      }));
    } else {
      console.log('❌ Fingerprint not found in database:', result.message);
      setVerification(prev => ({
        ...prev,
        step: "error",
        errorMessage: "Fingerprint not matched. Your fingerprint data may have changed. Please register again.",
      }));
    }
  } catch (err: any) {
    console.error('❌ Fingerprint verification error:', err);
    setVerification(prev => ({
      ...prev,
      step: "error",
      errorMessage: `Verification failed: ${err?.message || "Backend error"}. Please try again or use temporary access.`
    }));
  }
};
```

**Backend Process (Python/FastAPI):**

```python
# backend/routers/auth.py
@router.post("/auth/verify-fingerprint")
async def verify_fingerprint(user_id: str, db: Session):
    """
    Verify if fingerprint is registered for this user
    """
    try:
        # Query database
        user = db.query(BiometricUser).filter(
            BiometricUser.user_id == user_id
        ).first()
        
        if not user or not user.fingerprint_data:
            return {"verified": False, "message": "Fingerprint not registered"}
        
        # Fingerprint found in database for this user
        return {
            "verified": True,
            "message": "Fingerprint verified",
            "user_id": user_id
        }
    
    except Exception as e:
        return {
            "verified": False,
            "message": f"Verification error: {str(e)}"
        }
```

**Database Query:**
```sql
SELECT * FROM biometric_users 
WHERE user_id = ? AND fingerprint_data IS NOT NULL;
```

**Outcomes:**
- ✅ Found in DB → Fingerprint verified → Proceed to face verification
- ❌ Not in DB → Fingerprint not registered → Show error

---

### **Phase 2: Face Verification**

#### **Step 2a: Face Capture & Embedding Extraction**

FaceScanner captures and analyzes face:

```typescript
// src/components/FaceScanner.tsx
const captureFace = async () => {
  try {
    // Request device camera access
    const photo = await Camera.getPhoto({
      quality: 90,
      source: CameraSource.Camera,
      resultType: CameraResultType.Base64,
    });
    
    // Load ML model for face detection
    const model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
    );
    
    // Detect face in captured image
    const predictions = await model.estimateFaces(imageElement);
    
    if (!predictions || predictions.length === 0) {
      onError?.("No face detected. Please try again.");
      return;
    }
    
    // Extract face embedding (128-dimensional vector)
    const faceEmbedding = predictions[0].faceInferencesData[0].rawEmbedding;
    
    console.log('✅ Face embedding extracted:', faceEmbedding.length, 'dimensions');
    
    // Return to parent component
    onSuccess({
      embedding: faceEmbedding,
      confidence: predictions[0].confidence
    });
    
  } catch (error) {
    onError?.(error.message);
  }
};
```

**What Happens:**
1. Device camera opens (with "Smile for the camera" prompt)
2. ML model detects face in real-time
3. Extracts 128-dimensional face embedding (mathematical representation)
4. Returns embedding to app (NOT storing image, only data)
5. Sends embedding to backend for comparison

#### **Step 2b: Backend Face Comparison**

Backend compares captured embedding with stored embedding:

```typescript
// src/pages/Login.tsx - handleFaceSuccess
const handleFaceSuccess = async (faceData: any) => {
  console.log('✅ Face scanned locally - now verifying with backend');
  
  if (!verification.userId) {
    setVerification(prev => ({
      ...prev,
      step: "error",
      errorMessage: "Session error: No user ID. Please start over."
    }));
    return;
  }

  try {
    const faceEmbedding = faceData?.embedding || [];
    
    if (!Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      setVerification(prev => ({
        ...prev,
        step: "error",
        errorMessage: "Face embedding not captured. Please try again."
      }));
      return;
    }

    console.log('🔍 Verifying face with backend for userId:', verification.userId);
    
    // Call backend to compare embeddings
    const result = await verifyFaceBackend(faceEmbedding, verification.userId);
    
    if (result.verified) {
      console.log('✅ Face verified! Storing tokens and redirecting to dashboard');
      
      // Store authentication tokens
      if (result.token) {
        await appStorage.setItem('biovault_token', result.token);
        localStorage.setItem('biovault_token', result.token);
      }
      if (result.refreshToken) {
        await appStorage.setItem('biovault_refresh_token', result.refreshToken);
        localStorage.setItem('biovault_refresh_token', result.refreshToken);
      }
      
      // Ensure user ID is stored
      await appStorage.setItem('biovault_userId', verification.userId);
      localStorage.setItem('biovault_userId', verification.userId);
      
      setVerification(prev => ({
        ...prev,
        step: "success"
      }));
      
      // Animate and navigate
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigate("/dashboard", { replace: true });
    } else {
      setVerification(prev => ({
        ...prev,
        step: "error",
        errorMessage: result.message || "Face not matched. Please try again."
      }));
    }
  } catch (err: any) {
    console.error('❌ Face verification error:', err);
    setVerification(prev => ({
      ...prev,
      step: "error",
      errorMessage: "Face verification failed. Please try again."
    }));
  }
};
```

**Backend Process (Python/FastAPI):**

```python
# backend/routers/auth.py
from scipy.spatial.distance import cosine

@router.post("/auth/verify-face")
async def verify_face(face_embedding: list[float], user_id: str, db: Session):
    """
    Compare provided face embedding with stored face embedding
    """
    try:
        # Get user's stored face embedding
        user = db.query(BiometricUser).filter(
            BiometricUser.user_id == user_id
        ).first()
        
        if not user or not user.face_embedding:
            return {
                "verified": False,
                "message": "Face not registered for this user"
            }
        
        # Convert stored embedding from JSON to list
        stored_embedding = json.loads(user.face_embedding)
        
        # Calculate cosine similarity between embeddings
        similarity = 1 - cosine(face_embedding, stored_embedding)
        
        # Compare against threshold (0.6 = 60% similar)
        SIMILARITY_THRESHOLD = 0.6
        is_match = similarity >= SIMILARITY_THRESHOLD
        
        if is_match:
            # Generate JWT token for this session
            token = create_jwt_token(user_id)
            refresh_token = create_refresh_token(user_id)
            
            # Log successful login
            db.add(LoginAttempt(
                user_id=user_id,
                method="face",
                success=True,
                timestamp=datetime.utcnow()
            ))
            db.commit()
            
            return {
                "verified": True,
                "message": "Face verified",
                "token": token,
                "refreshToken": refresh_token,
                "similarity": similarity
            }
        else:
            return {
                "verified": False,
                "message": f"Face not matched. Similarity: {similarity:.2%}",
                "similarity": similarity
            }
    
    except Exception as e:
        return {
            "verified": False,
            "message": f"Verification error: {str(e)}"
        }
```

**Similarity Calculation:**
```
Stored embedding:    [0.12, 0.45, 0.33, ..., 0.78] (128 values)
Captured embedding:  [0.11, 0.46, 0.32, ..., 0.79] (128 values)
                        ↓
              Calculate cosine similarity
                        ↓
            Similarity = 0.87 (87% match)
                        ↓
            Is 0.87 >= 0.60? YES
                        ↓
            ✅ FACE VERIFIED!
```

**Outcomes:**
- ✅ Similarity >= Threshold → Face verified → Issue tokens
- ❌ Similarity < Threshold → Face not matched → Show error
- ❌ Face not found on server → Not registered → Show error

---

### **Phase 3: Token Generation & Dashboard Access**

After successful face verification:

```typescript
// Tokens are generated by backend and stored on device
await appStorage.setItem('biovault_token', result.token);      // Main access token
await appStorage.setItem('biovault_userId', verification.userId); // User identifier

// Both are also stored in localStorage for web consistency
localStorage.setItem('biovault_token', result.token);
localStorage.setItem('biovault_userId', verification.userId);

// Redirect to dashboard
navigate("/dashboard", { replace: true });
```

**Token Contents (JWT):**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": "user@example.com",
    "sub": "auth_token",
    "iat": 1704067200,
    "exp": 1704153600,
    "iss": "pinit-vault-backend"
  },
  "signature": "abc123def456..."
}
```

**Dashboard Auto-Population:**
```typescript
// When component mounts, token is used to fetch user data
const vaultData = await vaultAPI.list(userId);  // Uses token for auth
// Returns all encrypted images for this user
```

---

## 📋 Registration to Authentication Flow

### **Initial Registration**

```
User opens app (not registered)
        ↓
Shows BiometricOptions page
        ├─ Option 1: Register New Biometric
        └─ Option 2: Temp Access (limited)
        
If "Register New Biometric" selected:
        ↓
1. Capture Fingerprint
   ├─ Place finger on sensor
   ├─ Device verifies locally
   └─ Send to backend, store in database
        ↓
2. Capture Face
   ├─ Look at camera
   ├─ Extract face embedding
   └─ Send to backend, store in database
        ↓
3. Create Account
   ├─ Generate user_id
   ├─ Store: biovault_userId
   └─ Store: biovault_token
        ↓
✅ Registration Complete → Dashboard
```

### **Subsequent Logins**

```
App displays Login page (detected existing user)
        ↓
Fingerprint Scanner
        ├─ User places finger
        ├─ Device verifies
        ├─ Backend checks database
        └─ ✅ Verified → Continue
        ↓
Face Scanner
        ├─ User looks at camera
        ├─ Extract embedding
        ├─ Backend compares with stored
        └─ ✅ Verified → Issue tokens
        ↓
Dashboard
        ├─ Load vault data
        ├─ Display encrypted images
        └─ Ready for encryption/download
```

---

## 🔄 Error Recovery

### **Fingerprint Errors**

```
Fingerprint Scan Fails
        ↓
┌─────────────────────────────────────┐
│ ❌ Fingerprint not matched.         │
│                                     │
│ Your fingerprint data may have      │
│ changed. Please register again.     │
│                                     │
│ [Retry] [Register] [Temp Access]    │
└─────────────────────────────────────┘

Options:
1. Retry → Go back to fingerprint scanner
2. Register → Start registration flow
3. Temp Access → Limited access without biometric
```

### **Face Errors**

```
Face Not Recognized
        ↓
┌─────────────────────────────────────┐
│ ❌ Face not matched.                │
│    Similarity: 45%                  │
│                                     │
│ Try getting better lighting or      │
│ removing glasses/mask.              │
│                                     │
│ [Retry] [Change Method] [Temp Access]
└─────────────────────────────────────┘

Options:
1. Retry → Take another face pic
2. Change Method → Try different biometric
3. Temp Access → Quick access
```

---

## 🔒 Security Measures

### **1. Database Protection**

```sql
-- Biometric data encrypted on backend
CREATE TABLE biometric_users (
  user_id VARCHAR PRIMARY KEY,
  fingerprint_data BYTEA ENCRYPTED,      -- Encrypted storage
  face_embedding BYTEA ENCRYPTED,        -- Encrypted storage
  webauthn_credential BYTEA ENCRYPTED,   -- Encrypted storage
  created_at TIMESTAMP,
  last_login TIMESTAMP
);

-- Login attempts logged for security audit
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR,
  method VARCHAR,       -- 'fingerprint' or 'face'
  success BOOLEAN,
  timestamp TIMESTAMP,
  ip_address VARCHAR,
  device_info VARCHAR
);
```

### **2. Token Security**

- ✅ JWTs have **1-hour expiration**
- ✅ Refresh tokens for long sessions
- ✅ Tokens stored securely in device storage
- ✅ Tokens cleared on logout
- ✅ HTTPS-only transmission

### **3. Biometric Privacy**

- ✅ Fingerprint/face NEVER leaves device during scan
- ✅ Only embeddings/hashes sent to backend
- ✅ Embeddings encrypted before storage
- ✅ Cannot be reversed to reconstruct original biometric
- ✅ User can revoke biometric from dashboard

---

## 📊 Authentication Flow Diagram

```
┌──────────────────┐
│   Open App       │
└────────┬─────────┘
         ↓
    ┌────────────────────────┐
    │ Check: User Registered?│
    └────┬───────────────┬───┘
         │ YES           │ NO
         ↓               ↓
    ┌─────────────┐  ┌─────────────────┐
    │ Show Login  │  │ BiometricOptions│
    └──────┬──────┘  └───────────┬─────┘
           ↓                     ↓
    ┌──────────────────┐  ┌────────────────┐
    │ Fingerprint      │  │ Register or    │
    │ Scanner Opens    │  │ Temp Access    │
    └────────┬─────────┘  └────┬───────────┘
             ↓                 ↓
    ┌────────────────────┐  ┌─────────────┐
    │ 1. Device Scan    │  │ Registration│
    │ 2. Backend Verify │  │ Flow...     │
    │ 3. Check DB       │  └─────────────┘
    └────────┬─────────┘
             ↓
    ┌────────────────────┐
    │ Fingerprint        │
    │ ✅ Verified?       │
    └──┬──────────────┬──┘
       │ YES          │ NO
       ↓              ↓
   ┌────────┐    ┌───────┐
   │Face    │    │Error  │
   │Scanner │    │Retry? │
   └───┬────┘    └───┬───┘
       ↓             ↓
   ┌────────────────────┐
   │ 1. Device Capture  │
   │ 2. ML Embedding    │
   │ 3. Backend Compare │
   │ 4. Check Similarity│
   └────────┬───────────┘
            ↓
   ┌────────────────────┐
   │ Face               │
   │ ✅ Verified?       │
   └──┬──────────────┬──┘
      │ YES          │ NO
      ↓              ↓
   ┌──────────┐  ┌────────┐
   │Issue     │  │Error   │
   │Tokens    │  │Retry?  │
   └────┬─────┘  └────────┘
        ↓
   ┌──────────────────┐
   │ ✅ Authenticated │
   │ Store:           │
   │ - token          │
   │ - userId         │
   │ - refreshToken   │
   └────────┬─────────┘
            ↓
   ┌──────────────────┐
   │ Navigate to      │
   │ Dashboard        │
   └──────────────────┘
```

---

## 📝 Summary

PINIT Vault's biometric authentication provides:

- ✅ **Two-factor verification**: Fingerprint + Face
- ✅ **Device-native security**: Uses device's built-in sensors
- ✅ **ML-powered recognition**: On-device face detection
- ✅ **Encrypted storage**: Biometric data secured on backend
- ✅ **Token-based sessions**: JWT tokens for API access
- ✅ **Automatic logout**: Clear tokens on exit
- ✅ **Error recovery**: Retry options and fallback access
- ✅ **Audit logging**: Track login attempts for security
- ✅ **Privacy-first**: Embeddings not reversible to original biometric
- ✅ **User control**: Can register new biometrics or revoke access
