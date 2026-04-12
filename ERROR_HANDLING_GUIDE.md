# 🛡️ Error Handling Guide - Biometric Authentication

**Version**: 2.0 | **Updated**: Dec 30, 2024| **Status**: ✅ IMPLEMENTED

## Overview

This guide documents all error scenarios in the biometric authentication system and their user-facing messages. All errors are now categorized with specific remediation steps.

---

## 1. 📱 Fingerprint Scanner Errors

### 1.1 Native Biometric Errors (Capacitor)

#### ❌ Scan Cancelled
```
User Action: User cancels biometric prompt
Message: "⚠️ Scan cancelled. Please try again."
Trigger: err.message includes 'cancel', 'Cancel', or 'Touched'
Solution: Retry fingerprint scan
Code: FingerprintScanner.tsx:84-87
```

#### ❌ Biometric Not Available
```
User Action: Device doesn't support biometrics
Message: "⚠️ Biometric not available. Use password login instead."
Trigger: err.message includes 'not available' or 'not supported'
Solution: Use password authentication
Code: FingerprintScanner.tsx:88-91
```

#### ⏱️ Scan Timeout
```
User Action: Biometric takes too long
Message: "⏱️ Scan timeout. Please try again."
Trigger: err.message includes 'Timeout' or 'timeout'
Solution: Retry, ensure good finger contact
Code: FingerprintScanner.tsx:92-95
```

#### 🔒 Too Many Attempts
```
User Action: User fails biometric verification too many times
Message: "🔒 Too many attempts. Try again in a moment."
Trigger: err.message includes 'Too many'
Solution: Wait a few moments, retry
Code: FingerprintScanner.tsx:96-99
```

#### 👆 Fingerprint Not Matching
```
User Action: Scanned fingerprint doesn't match enrolled
Message: "❌ Fingerprint not matching. Ensure finger is clean and dry."
Trigger: All other native errors
Solution: Clean finger, retry scan
Code: FingerprintScanner.tsx:100-103
```

### 1.2 WebAuthn Registration Errors

#### 🌐 Network Error During Registration
```
User Action: Backend communication fails during save
Message: "🌐 Network error. Check your internet connection."
Trigger: err.message includes 'Network' or 'NetworkError'
Solution: Check connection, retry
Code: FingerprintScanner.tsx:172-174
```

#### ⚠️ Server Communication Error
```
User Action: JSON parsing fails from server response
Message: "⚠️ Server communication error. Please try again."
Trigger: err.message includes 'JSON parse'
Solution: Retry registration
Code: FingerprintScanner.tsx:175-177
```

#### 💾 Failed to Save Fingerprint
```
User Action: Database save fails
Message: "💾 Failed to save. Please try again."
Trigger: err.message includes 'Failed to save'
Solution: Retry fingerprint registration
Code: FingerprintScanner.tsx:178-180
```

#### 🚫 Registration Cancelled
```
User Action: User cancels registration process
Message: "⚠️ Registration cancelled. Please try again."
Trigger: err.message includes 'cancelled'
Solution: Restart registration
Code: FingerprintScanner.tsx:181-183
```

### 1.3 WebAuthn Login/Verification Errors

#### 🔐 Not Registered
```
User Action: User not found in system
Message: "🔐 Not registered. Please register your fingerprint first."
Trigger: err.message includes 'not authorized' or 'User not'
Solution: Navigate to registration
Code: FingerprintScanner.tsx:210-212
```

#### 📱 Device Not Recognized
```
User Action: Device token missing/invalid
Message: "📱 Device not recognized. Re-register required."
Trigger: err.message includes 'device token'
Solution: Re-register device and biometric
Code: FingerprintScanner.tsx:215-217
```

#### 👤 User Not Found
```
User Action: User account deleted or corrupted
Message: "📋 User not found. Please register first."
Trigger: err.message includes 'User not registered'
Solution: Navigate to registration
Code: FingerprintScanner.tsx:218-220
```

### 1.4 Generic Fingerprint Errors

#### ⏱️ Operation Timeout
```
Message: "⏱️ Operation timed out. Please try again."
Trigger: Top-level catch, message includes 'timeout'
Solution: Retry operation
Code: FingerprintScanner.tsx:237-239
```

#### 🌐 Network Connectivity
```
Message: "🌐 Network error. Check your connection."
Trigger: Top-level catch, message includes 'Network'
Solution: Check internet connection, retry
Code: FingerprintScanner.tsx:240-242
```

#### 🚫 Operation Cancelled
```
Message: "⚠️ Operation cancelled. Please try again."
Trigger: Top-level catch, message includes 'cancelled'
Solution: Retry operation
Code: FingerprintScanner.tsx:235-236
```

---

## 2. 🎥 Face Scanner Errors

### 2.1 Camera Permission Errors

#### ❌ Camera Permission Denied
```
User Action: User denies camera access
Message: "❌ Camera permission denied. Please enable camera in app settings and retry."
Trigger: err.message includes 'Permission', 'permission', or 'NotAllowed'
Solution: Enable camera in app settings, retry
Code: FaceScanner.tsx:125-126
Location: Camera initialization phase
```

#### ❌ Camera Access Failed
```
User Action: Camera access fails (other reasons)
Message: "❌ Camera access failed. Please check device settings and retry."
Trigger: Generic camera error
Solution: Check device settings, retry
Code: FaceScanner.tsx:128-129
Location: Camera initialization phase
```

### 2.2 Face Detection Errors

#### ⚠️ Face Detection Unavailable
```
User Action: ML model fails to load
Message: "⚠️ Face detection unavailable. Please ensure stable internet connection."
Trigger: Face detection model load fails
Solution: Check internet, retry
Code: FaceScanner.tsx:112-113
Location: Model loading phase
```

#### 📊 Face Quality Too Low
```
User Action: Scanned face has poor quality
Message: "❌ Face quality too low. Need better lighting. (Quality: X.X)"
Trigger: Embedding quality score below threshold
Solution: Improve lighting, reposition face
Code: FaceScanner.tsx:346-350
Location: Face verification phase
```

### 2.3 Face Verification Errors  

#### ❌ Face Not Matching (Registration)
```
User Action: Registered face doesn't match new scan
Message: "❌ Face does not match registered profile. Please retry."
Trigger: Face verification fails in login mode
Solution: Ensure proper lighting, clear face visibility
Code: FaceScanner.tsx:358-359
Location: Face comparison phase
```

#### 👤 User Not Registered
```
User Action: No userId stored (device not registered)
Message: "❌ User not registered on this device."
Trigger: No userId in appStorage during login
Solution: Register account first
Code: FaceScanner.tsx:355-356
Location: Pre-verification check
```

### 2.4 Server Communication Errors

#### ❌ Similarity Below Threshold
```
User Action: Face recognized but similarity too low
Message: From server response (verify response.reason)
Trigger: Face exists but similarity < 0.8
Solution: Retry with better positioning
Code: FaceScanner.tsx:360-362
Location: Backend face comparison
```

---

## 3. 🔐 Login Flow Errors

### 3.1 Initialization Errors

#### 📋 No User Registration Found
```
Location: Login.tsx useEffect - checkRegistration()
Issue: User hasn't registered on this device
Action: Navigate to biometric-options
Message: None (automatic redirect)
Code: Login.tsx:54
```

### 3.2 Fingerprint Verification Errors

#### 🔍 User ID Lookup Failed
```
Location: handleFingerprintSuccess()
Trigger: appStorage fails to retrieve userId
Message: "Unable to retrieve your account information. Please register again."
Action: Show error, offer retry or register
Code: Login.tsx:71-79
```

#### 👤 User Not Found in Storage
```
Location: handleFingerprintSuccess()
Trigger: userId is null/empty
Message: "Account not found. Please register first."
Action: Show error with link to register
Code: Login.tsx:81-90
```

#### 🔐 Fingerprint Not in Database
```
Location: handleFingerprintSuccess()
Trigger: Backend returns verified: false
Message: "Fingerprint not matched. Your fingerprint data may have changed. Please register again."
Action: Send to registration
Code: Login.tsx:102-109
```

### 3.3 Face Verification Errors

#### 💾 Session Error - No User ID
```
Location: handleFaceSuccess()
Trigger: verification.userId is null
Message: "Session error: No user ID. Please start over."
Action: Restart login flow
Code: Login.tsx:119-127
```

#### ❌ No Face Embedding
```
Location: handleFaceSuccess()
Trigger: faceData.embedding is empty
Message: "Face embedding not captured. Please try again."
Action: Retry face capture
Code: Login.tsx:135-143
```

#### ❌ Face Not Matching Backend
```
Location: handleFaceSuccess()
Trigger: Backend returns verified: false
Message: "Face not matched. Please try again."
Action: Retry face capture
Code: Login.tsx:160-163
```

---

## 4. 🔄 Temporary Access Errors

See [TEMP_ACCESS_ERROR_GUIDE.md] for complete temporary access error handling.

---

## 5. 📋 Registration Errors

See [REGISTRATION_ERROR_GUIDE.md] for complete registration error handling.

---

## Error Logger Configuration

All errors are logged with emoji prefixes for easy debugging:

```typescript
// Error levels
🔴 - Critical errors (requires restart)
⚠️ - Warnings (user action needed)
📋 - Info messages
✓ - Success
📊 - Metrics/Debug info
```

### Enable Debug Logging

In browser console:
```javascript
// Toggle verbose logging
localStorage.setItem('biovault_debug', 'true');
// Reload page
window.location.reload();
```

---

## 6. 🔧 Troubleshooting Checklist

### For Users Seeing Errors

- [ ] **"Permission denied"** → Check app settings, enable camera/biometric
- [ ] **"Network error"** → Check WiFi/mobile connection
- [ ] **"Not recognized"** → Clean finger/face, better lighting
- [ ] **"Not registered"** → Complete registration first
- [ ] **"Device not recognized"** → Re-register on this device

### For Developers Seeing Errors

- [ ] Check console logs (search for 🔴 emoji)
- [ ] Check network tab for API failures
- [ ] Verify backend is running and reachable
- [ ] Check localStorage for stored credentials
- [ ] Test biometric hardware availability

---

## 7. 📊 Error Metrics

All errors trigger these tracking points:

```typescript
// Error reported to parent component
onError?.(friendlyMessage)

// Error logged to console
console.error('🔴 Component error:', rawError)

// Status UI updated
setStatus('error')
setMessage('❌ ' + userFriendlyMessage)
```

---

## 8. Recovery Flows

### From Fingerprint Error
1. Show error message + "Retry" button
2. Reset scanner state to "idle"
3. User can tap "Retry" to restart scan
4. Alternative: "Use Face" or "Temp Access"

### From Face Error
1. Show error message
2. Offer "Retry" button
3. If persistent: "Temp Access" or "Register Again"

### From Verification Error
1. Show error with specific reason
2. Offer "Retry" button
3. If mismatch: "Register Again"
4. Fallback: "Temporary Access"

---

## 9. ✅ Implementation Status

### ✅ Completed
- [x] FingerprintScanner error categorization
- [x] FaceScanner error messages
- [x] Login error handling
- [x] Error message display in UI
- [x] User-friendly error descriptions
- [x] Console logging with emojis

### 🔄 In Progress
- [ ] Error analytics/tracking
- [ ] Error recovery suggestions
- [ ] Offline error handling

### 📋 Planned
- [ ] Multi-language error messages
- [ ] Error feedback form
- [ ] Error pattern analysis

---

## 10. 🔐 Security Considerations

⚠️ **Important**: Error messages do NOT reveal:
- ✅ Database structure
- ✅ User credentials
- ✅ API endpoints
- ✅ System internals

All errors are generic enough for user safety while helpful for troubleshooting.

---

## 📞 Support

For error-related issues:
1. Check this guide for your error message
2. Follow the "Solution" steps
3. Check [TESTING_GUIDE.md] for device-specific fixes
4. Contact support with error code and screenshot
