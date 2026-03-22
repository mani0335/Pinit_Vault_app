import { useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { isBiometricAvailable, showBiometricPrompt } from "@/lib/biometric";
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
}

export function FingerprintScanner({ onSuccess, onError, mode, onCredential, required = false }: FingerprintScannerProps) {
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const SUCCESS_HOLD_MS = 350;
  
  const cancelScan = useCallback(() => {
    setStatus("idle");
    setMessage("Scan cancelled");
  }, []);

  const startScan = useCallback(async () => {
    setStatus("scanning");
    setMessage("Place your finger on the sensor...");

    try {
      const win: any = window as any;
      const hasNativePlugin = !!(win.FingerprintAIO || win.Fingerprint);

      // Prefer native biometric plugin when available
      if (hasNativePlugin) {
        try {
          const avail = await isBiometricAvailable();
          if (avail.available) {
            console.log('FingerprintScanner: using native biometric plugin');
            // IMPORTANT: This will throw an error if user cancels
            await showBiometricPrompt({ clientId: 'SecureSweet' });
            
            setMessage('Fingerprint verified. Registering...');
            
            // On native biometric success, verify fingerprint with backend if this is login
            if (mode === 'login') {
              try {
                const userId = await appStorage.getItem('biovault_userId');
                console.log('🔍 FingerprintScanner LOGIN mode - userId from storage:', userId);
                
                if (!userId) {
                  throw new Error('User ID not found in storage. Please register first.');
                }
                
                const { getDeviceToken } = await import('@/lib/deviceToken');
                const deviceToken = await getDeviceToken();
                console.log('✅ Got device token, checking user registration');
                
                // Check with backend if user has fingerprint registered
                const { checkUserRegistered } = await import('@/lib/authService');
                const result = await checkUserRegistered(userId);
                
                console.log('📍 Fingerprint verification result:', result);
                
                if (!result.ok) {
                  throw new Error(result.reason || 'User not found in database');
                }
                
                // STRICT: Require fingerprint to be registered
                if (!result.fingerprintRegistered) {
                  throw new Error('❌ Fingerprint not registered for this user. Please re-register.');
                }
                
                // STRICT: Require face to be registered
                if (!result.faceRegistered) {
                  throw new Error('❌ Face data not registered. Please re-register.');
                }
                
                console.log('✅ User has both fingerprint and face registered - proceeding to face verification');
                // Success - fingerprint verified locally, user has fingerprint + face in database
                setStatus('success');
                setMessage('✓ Fingerprint Verified');
                setTimeout(onSuccess, SUCCESS_HOLD_MS);
                return;
              } catch (e: any) {
                const msg = (e?.message || '').toString();
                const friendly = msg || 'Fingerprint verification failed. Please try again.';
                console.error('❌ Fingerprint login error:', friendly);
                setStatus('error');
                setMessage('❌ ' + friendly);
                onError?.(friendly || 'Fingerprint verification failed');
                setTimeout(() => setStatus('idle'), 3000);
                return;
              }
            }
            
            // For register mode: verify fingerprint was successfully registered in database
            try {
              const { getDeviceToken } = await import('@/lib/deviceToken');
              const deviceToken = await getDeviceToken();
              const userId = await appStorage.getItem('biovault_userId');
              
              console.log('📍 Registering Fingerprint - userId:', userId, 'deviceToken:', deviceToken);
              
              // CRITICAL: Validate both userId and deviceToken exist
              if (!userId || userId.trim() === '') {
                throw new Error('❌ User ID is missing. Please complete registration form first.');
              }
              if (!deviceToken || deviceToken.trim() === '') {
                throw new Error('❌ Device token is missing. Please restart app and try again.');
              }
              
              console.log('✅ STEP 1: userId and deviceToken validated');
              
              // Store fingerprint registration in backend
              // Always use Render URL fallback so app works from anywhere (especially on phone)
              const API_BASE = (import.meta.env.VITE_API_URL || 'https://biovault-app.onrender.com').trim();
              const url = `${API_BASE}/api/register-fingerprint`;
              console.log('🔐 STEP 2: Calling:', url);
              
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, deviceToken, credential: null })
              });
              
              console.log('📥 STEP 3: Response status:', response.status);
              
              const responseText = await response.text();
              console.log('📄 Response text:', responseText.substring(0, 200));
              
              let data;
              try {
                data = JSON.parse(responseText);
                console.log('✅ STEP 4: Parsed JSON:', data);
              } catch (parseErr: any) {
                console.error('❌ JSON parse error:', parseErr.message);
                throw new Error(`Server error: ${responseText.substring(0, 100)}`);
              }
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to register fingerprint');
              }
              
              console.log('✅ STEP 5: Fingerprint registered successfully');
              setStatus('success');
              setMessage('✓ Fingerprint Registered');
              setTimeout(onSuccess, SUCCESS_HOLD_MS);
              return;
            } catch (dbErr: any) {
              console.error('❌ Fingerprint registration error:', dbErr);
              const msg = (dbErr?.message || 'Failed to register fingerprint').toString();
              setStatus('error');
              setMessage('❌ ' + msg);
              onError?.(msg);
              setTimeout(() => setStatus('idle'), 3000);
              return;
            }
          }
        } catch (nativeErr: any) {
          // User cancelled or biometric failed
          const errMsg = nativeErr?.message || '';
          if (errMsg.includes('cancel') || errMsg.includes('Cancel') || errMsg.includes('Touched')) {
            setStatus('error');
            setMessage('❌ Fingerprint scan cancelled. Please try again.');
            onError?.('Fingerprint scan was cancelled');
          } else {
            setStatus('error');
            setMessage('❌ Fingerprint not recognized. Please try again.');
            onError?.('Fingerprint authentication failed');
          }
          setTimeout(() => setStatus('idle'), 2500);
          return;
        }
      }

      // Fallback to WebAuthn if available
      if (!window.PublicKeyCredential || typeof navigator.credentials === 'undefined') {
        throw new Error('Biometric authentication not available on this device');
      }

      if (mode === "register") {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "BioVault", id: window.location.hostname },
            user: {
              id: userId,
              name: "user@biovault.io",
              displayName: "BioVault User",
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
          onCredential?.(attestation);
          
          // Store in database
          const { getDeviceToken } = await import('@/lib/deviceToken');
          const deviceToken = await getDeviceToken();
          const storedUserId = await appStorage.getItem('biovault_userId');
          
          console.log('📍 Saving fingerprint credential - userId:', storedUserId, 'deviceToken:', deviceToken);
          
          const API_BASE = (import.meta.env.VITE_API_URL || 'https://biovault-app.onrender.com').trim();
          const url = `${API_BASE}/api/register-fingerprint`;
          console.log('🔐 Calling:', url);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: storedUserId, deviceToken, credential: attestation })
          });
          
          console.log('📥 Response status:', response.status);
          
          const responseText = await response.text();
          console.log('📄 Response text:', responseText.substring(0, 200));
          
          let data;
          try {
            data = JSON.parse(responseText);
            console.log('✅ Parsed JSON:', data);
          } catch (parseErr: any) {
            console.error('❌ JSON parse error:', parseErr.message);
            throw new Error(`Server error: ${responseText.substring(0, 100)}`);
          }
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to save fingerprint to database');
          }

          setStatus("success");
          setMessage("✓ Fingerprint Registered");
          setTimeout(onSuccess, SUCCESS_HOLD_MS);
        } catch (e: any) {
          const msg = (e?.message || 'Failed to register fingerprint').toString();
          setStatus('error');
          setMessage('❌ ' + msg);
          onError?.(msg);
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
          const friendly = msg || 'User not authorized. Please register first.';
          setStatus('error');
          setMessage('❌ ' + friendly);
          onError?.(friendly);
          setTimeout(() => setStatus('idle'), 3000);
        }
      }
    } catch (err: any) {
      setStatus("error");
      const errMsg = err.message || "Fingerprint authentication failed";
      setMessage('❌ ' + errMsg);
      onError?.(errMsg);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [mode, onSuccess, onError, SUCCESS_HOLD_MS]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
      <div className="w-full text-center">
        <h3 className="text-xl md:text-2xl font-display font-semibold tracking-wide text-foreground">Fingerprint Authentication</h3>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Confirm your identity with a secure biometric scan.</p>
      </div>

      <div className="relative w-full max-w-[320px] h-[250px] rounded-2xl overflow-hidden border border-primary/35 bg-gradient-to-b from-card/95 via-card/85 to-background/90 shadow-[0_0_30px_hsl(var(--neon-glow)/0.18)]">
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
