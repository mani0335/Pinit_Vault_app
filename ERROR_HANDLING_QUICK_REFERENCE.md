# 🚀 Error Handling Quick Reference Card

**Print this for your desk!**

---

## 🔴 Critical Errors (Requires Action)

### Fingerprint Errors

| Message | Cause | Fix | Priority |
|---------|-------|-----|----------|
| "❌ Fingerprint not matching" | Fingerprint doesn't match enrolled | Clean finger, ensure good contact | 🟡 Medium |
| "⚠️ Biometric not available" | Device doesn't support biometrics | Use password auth instead | 🟢 Low |
| "🔒 Too many attempts" | User failed too many times | Wait a moment, retry | 🟡 Medium |
| "⏱️ Scan timeout" | Biometric hardware didn't respond | Retry scan | 🟡 Medium |
| "⚠️ Scan cancelled" | User cancelled prompt | No action (expected) | 🟢 Low |

### Face Errors

| Message | Cause | Fix | Priority |
|---------|-------|-----|----------|
| "❌ Face not matching" | Face doesn't match registered | Better lighting, clear view | 🟡 Medium |
| "❌ Face quality too low" | Poor image quality | Improve lighting, reposition | 🟡 Medium |
| "❌ Camera permission denied" | User denied camera access | Enable in app settings | 🟢 Low |
| "⚠️ Face detection unavailable" | ML model failed to load | Check internet, retry | 🟡 Medium |

### Registration Errors

| Message | Cause | Fix | Priority |
|---------|-------|-----|----------|
| "❌ Not registered" | First time login/incomplete registration | Complete registration flow | 🔴 High |
| "🔐 Not registered. Please register your fingerprint first." | User skipped fingerprint setup | Go back to registration | 🔴 High |
| "💾 Failed to save" | Database connection issue | Check backend, retry | 🔴 High |
| "🌐 Network error" | Internet connectivity issue | Check connection, retry | 🟡 Medium |

---

## 🛠️ Troubleshooting by Error Message

### "Permission denied"
```
User: Check phone Settings → Apps → [App Name] → Permissions → Camera/Biometric
Dev: Verify AndroidManifest.xml has required permissions
Expected: User grants permission and retries
```

### "Network error"
```
User: Check WiFi/mobile connection, retry
Dev: Verify API_URL is correct and backend is running
Test: ping API endpoint from dev console
```

### "Not registered"
```
User: Complete registration first (go through biometric setup)
Dev: Check localStorage has biovault_userId and token
Query: SELECT * FROM users WHERE id = ?
```

### "Device not recognized"  
```
User: Re-register on this device
Dev: Check device_token table, verify device binding
Reset: Clear localStorage and re-register
```

---

## 🎯 Quick Decision Tree

```
User reports error
│
├─ "Permission denied"
│  └─ → Android: Settings > Apps > Permissions
│     → iOS: Settings > [App] > Camera/Biometric
│
├─ "Network error"
│  └─ → Check WiFi/mobile
│     → Try different network
│     → Check API status
│
├─ "Device not recognized"
│  └─ → Clear app data
│     → Go through registration again
│
├─ "Not registered" 
│  └─ → User completes registration
│     → All biometric setup required
│
├─ "Biometric not matching"
│  └─ → Clean finger/face
│     → Better lighting
│     → Retry scan
│
└─ Still not working?
   └─ → Collect logs (localStorage → biovault_debug = true)
      → Check console for 🔴 emoji errors
      → Send logs to support
```

---

## 📱 Device-Specific Fixes

### Android
```
Fingerprint not working:
1. Settings → Security & Location → Biometric
2. Add new fingerprint
3. Ensure good contact with sensor
4. App needs android.permission.USE_BIOMETRIC

Face not detected:
1. Settings → Camera permissions
2. Ensure good lighting
3. Remove glasses/masks if possible
```

### iOS
```
Fingerprint/Face ID not working:
1. Settings → Face ID & Passcode (or Touch ID)
2. Ensure Face ID/Touch ID is enabled
3. Add fingerprint/face if missing
4. App needs NSFaceIDUsageDescription in Info.plist

Web:
1. Need HTTPS (WebAuthn requirement)
2. Only works with registered devices
3. Check camera permissions in browser
```

---

## 🔍 Debug Commands

### Browser Console
```javascript
// Enable debug logging
localStorage.setItem('biovault_debug', 'true');
location.reload();

// Check stored credentials
console.log(localStorage.getItem('biovault_userId'));
console.log(localStorage.getItem('biovault_token'));

// Check device token
const { getDeviceToken } = await import('@/lib/deviceToken');
console.log(await getDeviceToken());

// Clear all data (start fresh)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### API Testing
```bash
# Test backend connectivity
curl https://biovault-backend.onrender.com/api/health

# Test registration API
curl -X POST https://biovault-backend.onrender.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"...","embedding":[...]}'

# Check user exists
curl https://biovault-backend.onrender.com/api/users/[userId]
```

---

## 📊 Error Statistics (Track These)

| Metric | Target | Current |
|--------|--------|---------|
| Registration success rate | > 95% | ? |
| Login success rate (2 scans) | > 90% | ? |
| Average scan time | < 3 sec | ? |
| Network error rate | < 1% | ? |
| Hardware error rate | < 5% | ? |

---

## 📞 Support Script

**For Customer Support:**

```
Customer: "App says 'Device not recognized'"
Support: "This means the app needs to re-link to this phone.
         Please go through our registration process again.
         1. Open the app
         2. Tap 'Register'
         3. Scan your fingerprint
         4. Scan your face
         This usually takes 30 seconds.
         Should work now!"

Customer: "Still not working"
Support: "Let's try clearing the app:
         1. Go to Settings
         2. Apps > [App Name]
         3. Tap 'Storage' > 'Clear Data'
         4. Reopen app and register
         If still not working, please contact developers."
```

---

## 🚀 Performance Targets

| Operation | Target Time | Status |
|-----------|-------------|--------|
| Fingerprint scan | 2-3 seconds | ✅ |
| Face detection | 1-2 seconds | ✅ |
| Backend verification | < 1 second | ✅ |
| Total login | 5-7 seconds | ✅ |
| Registration | 30-45 seconds | ✅ |

---

## 🔐 Security Reminders

✅ **DO:**
- Show helpful error messages
- Log errors for debugging (with 🔴 emoji)
- Guide users toward recovery

❌ **DON'T:**
- Expose API paths in errors
- Reveal database structure
- Show user credentials
- Share internal system details

---

## 📈 Escalation Path

```
Level 1 - User Support
└─ Follow troubleshooting tree above
   └─ Cannot resolve → Level 2

Level 2 - Developer
└─ Check console logs (🔴 emoji errors)
   Check API connectivity
   Check database queries
   └─ Cannot resolve → Level 3

Level 3 - Engineering
└─ Full system audit
   Network analysis
   Database queries
   Device logs
   (collect all 🔴 errors)
```

---

## 📋 Checklist for New Support Staff

- [ ] Print this card
- [ ] Read ERROR_HANDLING_GUIDE.md
- [ ] Bookmark API status page
- [ ] Add phone number to contacts
- [ ] Setup browser console debugging
- [ ] Test 2-3 error scenarios yourself
- [ ] Know the decision tree by heart
- [ ] Can explain permission errors
- [ ] Can explain network errors
- [ ] Know when to escalate

---

## 🎓 Training Scenario

**Scenario 1: User gets "Fingerprint not matching"**
```
1. What happened: User's fingerprint didn't match stored fingerprint
2. Why: Fingerprint quality too low, or wrong finger
3. Fix: Clean finger, ensure sensor contact, retry
4. If fails 3 times: Suggest registration again
Result: User tries again, usually succeeds
```

**Scenario 2: User gets "Network error"**
```
1. What happened: No internet or backend down
2. Why: WiFi disconnected or API unavailable
3. Fix: Check connection, wait 30 sec, retry
4. If persists: Check API status page
Result: Usually resolves after reconnect
```

**Scenario 3: User gets "Device not recognized"**
```
1. What happened: App lost device binding
2. Why: Data cleared, device changed, storage full
3. Fix: Clear app data, go through registration
4. If fails: Escalate to developer
Result: Registration process binds device again
```

---

**Last Updated**: December 30, 2024  
**Version**: 1.0  
**Maintainer**: Dev Team  
**Questions?** See ERROR_HANDLING_GUIDE.md or contact engineering team
