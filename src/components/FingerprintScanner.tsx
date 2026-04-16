import { useState, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { isBiometricAvailable, showBiometricPrompt, waitForFingerprintPlugin, waitForCordova } from "@/lib/biometric";
import { validateUser, verifyFingerprint } from "@/lib/authService";
import { appStorage } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, CheckCircle, XCircle } from "lucide-react";
import { ScanEffect } from "./ScanEffect";
import { Button } from "./ui/button";

interface FingerprintScannerProps {
  onSuccess: () => void;
  onError?: (error: string) => void;
  mode: "register" | "login";
  onCredential?: (webauthn: any) => void;
  required?: boolean;
  onScanningStateChange?: (isScanning: boolean) => void;
  userId?: string; // For register mode: to create stable credential ID
}

export function FingerprintScanner({ onSuccess, onError, mode, onCredential, required = false, userId }: FingerprintScannerProps) {
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const SUCCESS_HOLD_MS = 350;
  const [hasStarted, setHasStarted] = useState(false);
  
  const cancelScan = useCallback(() => {
    setStatus("idle");
    setMessage("Scan cancelled");
  }, []);

  const startScan = useCallback(async () => {
    setStatus("scanning");
    setMessage("Place your finger on the sensor...");

    try {
      const win: any = window as any;
      
      // ✅ CRITICAL FIX: Wait for Cordova deviceready and plugin initialization
      console.log('⏳ FingerprintScanner: Waiting for Cordova deviceready event...');
      const cordovaReady = await waitForCordova(10000);
      
      if (!cordovaReady) {
        console.error('❌ Cordova failed to initialize');
        // Fall through to check if plugin is available anyway
      }
      
      console.log('⏳ FingerprintScanner: Waiting for FingerprintAIO plugin...');
      const pluginReady = await waitForFingerprintPlugin(10000);
      
      if (!pluginReady) {
        console.warn('⚠️ FingerprintAIO plugin not available after 10s wait');
        console.log('  - win.FingerprintAIO:', typeof win.FingerprintAIO);
        console.log('  - win.Fingerprint:', typeof win.Fingerprint);
        console.log('  - window.cordova:', typeof win.cordova);
      }
      
      const hasNativePlugin = !!(win.FingerprintAIO || win.Fingerprint);

      // Prefer native biometric plugin when available
      if (hasNativePlugin) {
        try {
          console.log('🔍 FingerprintScanner: Native biometric plugin found - attempting scan');
          // IMPORTANT: This will throw an error if user cancels
          await showBiometricPrompt({ clientId: 'SecureSweet' });
          
          setMessage('Fingerprint verified. Registering...');
          
          // CRITICAL FOR REGISTRATION: Create credential object for native biometric
          if (mode === 'register') {
            console.log('📍 Register mode: Creating credential object for native fingerprint');
            const credentialId = userId ? `fp_${userId}_native` : `fp_native_temp_${Date.now()}`;
            const nativeCredential = {
              id: credentialId,
              type: 'public-key',
              biometricType: 'fingerprint',
              enrolledAt: Date.now(),
              verified: true
            };
            onCredential?.(nativeCredential);
            console.log('✅ Native fingerprint credential created:', credentialId);
          }
          
          // For register mode: skip separate fingerprint registration
          if (mode === 'register') {
            console.log('✅ Fingerprint registered locally for registration flow');
            setStatus('success');
            setMessage('✓ Fingerprint Registered');
            setTimeout(onSuccess, SUCCESS_HOLD_MS);
            return;
          }
          
          // For login mode: verify fingerprint with backend
          if (mode === 'login') {
            console.log('🔐 Login mode: Verifying fingerprint with backend');
            setMessage('Verifying with backend...');
            try {
              const loginUserId = userId || await appStorage.getItem('biovault_userId');
              if (!loginUserId) {
                throw new Error('User not authorized. Please register first.');
              }
              
              const credential = `fp_${loginUserId}_native`;
              const result = await verifyFingerprint(loginUserId, credential);
              const isVerified = result.ok || result.match || (result as any).verified;
              
              if (!isVerified) {
                const msg = result.reason || 'Fingerprint does not match registered profile';
                throw new Error(msg);
              }
              
              console.log('✅ Fingerprint verified with backend - proceeding to face authentication');
              setStatus('success');
              setMessage('✓ Fingerprint Verified');
              setTimeout(onSuccess, SUCCESS_HOLD_MS);
              return;
            } catch (err: any) {
              const msg = err?.message || 'Fingerprint verification failed';
              console.error('❌ Backend fingerprint verification error:', msg);
              
              let friendlyMsg = msg;
              if (msg.includes('User not') || msg.includes('not registered')) {
                friendlyMsg = 'User not recognized. Please register your fingerprint.';
              } else if (msg.includes('does not match')) {
                friendlyMsg = 'Fingerprint does not match. Please try again or register.';
              } else if (msg.includes('Network') || msg.includes('NetworkError')) {
                friendlyMsg = 'Network error. Check your internet connection.';
              }
              
              setStatus('error');
              setMessage('❌ ' + friendlyMsg);
              onError?.(friendlyMsg);
              setTimeout(() => setStatus('idle'), 2500);
              return;
            }
          }
        } catch (nativeErr: any) {
          // User cancelled or biometric failed
          const errMsg = nativeErr?.message || '';
          console.error('🔴 Native biometric error:', errMsg);
          
          if (errMsg.includes('cancel') || errMsg.includes('Cancel') || errMsg.includes('Touched')) {
            setStatus('error');
            setMessage('⚠️ Scan cancelled. Please try again.');
            onError?.('Fingerprint scan was cancelled');
          } else if (errMsg.includes('not available') || errMsg.includes('not supported')) {
            setStatus('error');
            setMessage('⚠️ Biometric not available. Use password login instead.');
            onError?.('Biometric not available');
          } else if (errMsg.includes('Timeout') || errMsg.includes('timeout')) {
            setStatus('error');
            setMessage('⏱️ Scan timeout. Please try again.');
            onError?.('Scan timeout');
          } else if (errMsg.includes('Too many')) {
            setStatus('error');
            setMessage('🔒 Too many attempts. Try again in a moment.');
            onError?.('Too many attempts');
          } else {
            setStatus('error');
            setMessage('❌ Fingerprint not matching. Ensure finger is clean and dry.');
            onError?.('Fingerprint not recognized');
          }
          setTimeout(() => setStatus('idle'), 2500);
          return;
        }
      } else {
        // ✅ NO NATIVE PLUGIN - For login mode, skip to face auth immediately
        if (mode === 'login') {
          console.log('📵 No native fingerprint plugin available - skipping to face authentication');
          console.log('   This is normal - the app will use face recognition instead');
          onError?.('Fingerprint not available - using face authentication');
          return;
        }
        
        // For register mode, fall back to WebAuthn
        console.log('📵 No native fingerprint plugin - falling back to WebAuthn');
      }

      // Fallback to WebAuthn if available
      if (!window.PublicKeyCredential || typeof navigator.credentials === 'undefined') {
        const supportMsg = 'Fingerprint not found. Proceeding to face authentication.';
        setStatus('error');
        setMessage('⚠️ Fingerprint not available');
        onError?.(supportMsg);
        setTimeout(() => setStatus('idle'), 3000);
        console.warn('🔴 Fingerprint unavailable - fallback to face auth');
        return;
      }

      if (mode === "register") {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "PINIT Vault", id: window.location.hostname },
            user: {
              id: userId,
              name: "user@pinitvault.io",
              displayName: "PINIT Vault User",
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" },
              { alg: -257, type: "public-key" },
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
            timeout: 60000,
          },
        });

        if (!credential) {
          throw new Error('Biometric registration was cancelled');
        }

        try {
          const abToBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
          const attestation = {
            id: credential.id,
            rawId: abToBase64(credential.rawId as ArrayBuffer),
            type: credential.type,
            response: {
              attestationObject: credential.response && (credential.response as any).attestationObject ? abToBase64((credential.response as any).attestationObject) : null,
              clientDataJSON: credential.response && (credential.response as any).clientDataJSON ? abToBase64((credential.response as any).clientDataJSON) : null,
            },
          };
          
          // ✅ FIXED: Just pass credential to parent component (Register.tsx)
          // Don't try to save to backend separately - Register.tsx will handle the complete registration
          // This prevents 404 errors from calling non-existent /api/register-fingerprint endpoint
          console.log('✅ Fingerprint credential captured - passing to Register component');
          console.log('📊 Credential ID:', attestation.id);
          onCredential?.(attestation);
          
          setStatus("success");
          setMessage("✓ Fingerprint Registered");
          setTimeout(onSuccess, SUCCESS_HOLD_MS);
        } catch (e: any) {
          const msg = (e?.message || 'Failed to register fingerprint').toString();
          console.error('🔴 Fingerprint registration error:', msg);
          
          let friendlyMsg = msg;
          if (msg.includes('cancelled') || msg.includes('Cancelled')) {
            friendlyMsg = '⚠️ Registration cancelled. Please try again.';
          } else {
            friendlyMsg = 'Failed to capture fingerprint. Please try again.';
          }
          
          setStatus('error');
          setMessage('❌ ' + friendlyMsg);
          onError?.(friendlyMsg);
          setTimeout(() => setStatus('idle'), 3000);
        }
      } else {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: "required",
          },
        });

        if (!credential) {
          throw new Error('Biometric verification was cancelled');
        }

        setMessage('Verifying with backend...');
        try {
          const { getDeviceToken } = await import('@/lib/deviceToken');
          const deviceToken = await getDeviceToken();
          const userId = await appStorage.getItem('biovault_userId');
          if (!userId || !deviceToken) throw new Error('User not authorized. Please register first.');
          const result = await validateUser(userId, deviceToken);
          if (result.authorized) {
            setStatus('success');
            setMessage('✓ Verified');
            setTimeout(onSuccess, SUCCESS_HOLD_MS);
          } else {
            throw new Error(result.reason || 'User not authorized');
          }
        } catch (e: any) {
          const msg = (e?.message || '').toString();
          console.error('🔴 Fingerprint login error:', msg);
          
          let friendlyMsg = msg;
          if (msg.includes('not authorized') || msg.includes('User not')) {
            friendlyMsg = '🔐 Not registered. Please register your fingerprint first.';
          } else if (msg.includes('Network') || msg.includes('NetworkError')) {
            friendlyMsg = '🌐 Network error. Check your internet connection.';
          } else if (msg.includes('device token')) {
            friendlyMsg = '📱 Device not recognized. Re-register required.';
          } else if (msg.includes('User not registered')) {
            friendlyMsg = '📋 User not found. Please register first.';
          } else if (!msg) {
            friendlyMsg = 'Fingerprint verification failed. Please try again.';
          }
          
          setStatus('error');
          setMessage('❌ ' + friendlyMsg);
          onError?.(friendlyMsg);
          setTimeout(() => setStatus('idle'), 3000);
        }
      }
    } catch (err: any) {
      setStatus("error");
      const errMsg = err.message || "Fingerprint authentication failed";
      console.error('🔴 FingerprintScanner error:', errMsg);
      
      let friendlyMsg = errMsg;
      if (errMsg.includes('cancelled') || errMsg.includes('Cancelled')) {
        friendlyMsg = '⚠️ Operation cancelled. Please try again.';
      } else if (errMsg.includes('Network') || errMsg.includes('NetworkError')) {
        friendlyMsg = '🌐 Network error. Check your connection.';
      } else if (errMsg.includes('timeout') || errMsg.includes('Timeout')) {
        friendlyMsg = '⏱️ Operation timed out. Please try again.';
      } else if (errMsg.includes('not available')) {
        friendlyMsg = '⚠️ Biometric not available. Use password login.';
      }
      
      setMessage('❌ ' + friendlyMsg);
      onError?.(friendlyMsg);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [mode, onSuccess, onError, SUCCESS_HOLD_MS]);

  // AUTO-TRIGGER biometric scan when required=true (for login/critical scans)
  useEffect(() => {
    if (required && !hasStarted && status === "idle") {
      console.log('🔄 Auto-triggering fingerprint scan (required mode)');
      setHasStarted(true);
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => startScan(), 300);
      return () => clearTimeout(timer);
    }
  }, [required, hasStarted, status, startScan]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
      <div className="w-full text-center">
        <h3 className="text-xl md:text-2xl font-display font-semibold tracking-wide text-foreground">Fingerprint Authentication</h3>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Confirm your identity with a secure biometric scan.</p>
      </div>

      <div className="relative w-full max-w-[320px] h-[250px] rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-card/95 via-card/85 to-background/90">
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--neon-glow)/0.16),transparent_62%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(hsl(var(--border)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.5) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono tracking-widest font-semibold text-white">
          <span className="px-3 py-1.5 rounded bg-primary/80 border border-primary">BIOMETRIC</span>
          <span className={`px-3 py-1.5 rounded border ${
            status === "scanning" ? "bg-primary/80 border-primary text-white animate-pulse" :
            status === "success" ? "bg-neon-green/80 border-neon-green text-black" :
            status === "error" ? "bg-destructive/80 border-destructive text-white" :
            "bg-background/60 border-border/60 text-foreground/90"
          }`}>
            {status === "scanning" ? "SCANNING" : status === "success" ? "✓ VERIFIED" : status === "error" ? "❌ FAILED" : "READY"}
          </span>
        </div>

        <motion.div
          className={`relative mx-auto mt-9 w-[170px] h-[170px] rounded-full glass-surface flex items-center justify-center overflow-hidden ${
            status === "success" ? "ring-4 ring-neon-green shadow-[0_0_20px_hsl(var(--neon-green)/0.8)]" : 
            status === "error" ? "ring-4 ring-destructive shadow-[0_0_20px_hsl(var(--destructive)/0.6)]" : 
            status === "scanning" ? "ring-4 ring-primary shadow-[0_0_20px_hsl(var(--neon-glow)/0.8)]" :
            "ring-2 ring-primary/30"
          }`}
          animate={status === "scanning" ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          <div className="absolute inset-3 rounded-full border border-primary/25" />
          <div className="absolute inset-6 rounded-full border border-primary/20" />
          <ScanEffect type="fingerprint" active={status === "scanning"} />

          {status === "scanning" && (
            <motion.div
              className="absolute left-4 right-4 h-1 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
              initial={{ y: -52, opacity: 0.65 }}
              animate={{ y: 52, opacity: [0.35, 1, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            />
          )}

          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <CheckCircle className="w-16 h-16 text-neon-green" />
              </motion.div>
            ) : status === "error" ? (
              <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <XCircle className="w-16 h-16 text-destructive" />
              </motion.div>
            ) : (
              <motion.div key="idle" animate={status === "scanning" ? { opacity: [0.5, 1, 0.5] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Fingerprint className="w-16 h-16 text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="absolute inset-x-5 bottom-4">
          <div className="w-full h-2.5 bg-background/60 rounded-full overflow-hidden border border-primary/20">
            <motion.div
              className={`h-full ${status === "error" ? "bg-destructive/80" : "bg-neon-green"} ${status === "scanning" ? "animate-pulse" : ""}`}
              animate={{
                width: status === "idle" ? "6%" : status === "scanning" ? ["20%", "78%", "58%", "85%"] : status === "success" ? "100%" : "100%",
              }}
              transition={{ duration: status === "scanning" ? 1.2 : 0.35, repeat: status === "scanning" ? Infinity : 0 }}
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col items-center gap-3">
        <p className="text-center text-sm md:text-base font-medium text-muted-foreground min-h-6">{message || "Ready for biometric verification"}</p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          {status === "idle" && (
            <Button variant="cyber" size="lg" onClick={startScan}>
              {mode === "register" ? "Capture Fingerprint" : "Verify Fingerprint"}
            </Button>
          )}

          {status === "scanning" && !required && (
            <Button variant="outline" size="lg" onClick={cancelScan}>
              Cancel
            </Button>
          )}

          {status === "error" && (
            <Button variant="outline" size="lg" onClick={() => setStatus("idle")}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
