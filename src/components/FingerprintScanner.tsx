import { useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { isBiometricAvailable, showBiometricPrompt } from "@/lib/biometric";
import { validateUser } from "@/lib/authService";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, CheckCircle, XCircle } from "lucide-react";
import { ScanEffect } from "./ScanEffect";
import { Button } from "./ui/button";

interface FingerprintScannerProps {
  onSuccess: () => void;
  onError?: (error: string) => void;
  mode: "register" | "login";
  onCredential?: (webauthn: any) => void;
}

export function FingerprintScanner({ onSuccess, onError, mode, onCredential }: FingerprintScannerProps) {
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

      // Prefer native biometric plugin when available (WebView may expose PublicKeyCredential
      // but not implement full WebAuthn -- prefer plugin for installed apps)
      if (hasNativePlugin) {
        try {
          const avail = await isBiometricAvailable();
          if (avail.available) {
            // eslint-disable-next-line no-console
            console.log('FingerprintScanner: using native biometric plugin');
            await showBiometricPrompt({ clientId: 'SecureSweet' });
            // On native biometric success, validate with backend if this is login
            setStatus('success');
            setMessage(mode === 'register' ? 'Biometric registered' : 'Biometric verified');
            if (mode === 'login') {
              try {
                const { getDeviceToken } = await import('@/lib/deviceToken');
                const deviceToken = await getDeviceToken();
                const userId = localStorage.getItem('biovault_userId');
                // debug
                // eslint-disable-next-line no-console
                console.log('Validate (native) values:', { userId, deviceToken });
                if (!userId || !deviceToken) throw new Error('User not authorized. Please register first.');
                const result = await validateUser(userId, deviceToken);
                if (result.authorized) {
                  setTimeout(onSuccess, SUCCESS_HOLD_MS);
                  return;
                } else {
                  throw new Error(result.reason || 'User not authorized');
                }
              } catch (e: any) {
                const msg = (e?.message || '').toString();
                const friendly = msg || 'User not authorized. Please register first.';
                setStatus('error');
                setMessage(friendly);
                onError?.(friendly || 'User not authorized');
                setTimeout(() => setStatus('idle'), 3000);
                return;
              }
            }
            setTimeout(onSuccess, SUCCESS_HOLD_MS);
            return;
          }
        } catch (nativeErr) {
          // If native plugin check fails, fall back to WebAuthn below
          // eslint-disable-next-line no-console
          console.warn('Native biometric check failed, falling back to WebAuthn', nativeErr);
        }
      }

      // Fallback to WebAuthn if available
      if (!window.PublicKeyCredential || typeof navigator.credentials === 'undefined') {
        throw new Error('Native biometric plugin not available and WebAuthn is unsupported');
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

        if (credential) {
          // build attestation object and notify parent so it can be stored with userId
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
            // pass credential to parent for registration payload
            onCredential?.(attestation);
          } catch (e) {
            // ignore conversion errors
          }

          setStatus("success");
          setMessage("Fingerprint registered successfully!");
          setTimeout(onSuccess, SUCCESS_HOLD_MS);
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

        if (credential) {
          // On WebAuthn success validate with backend
          setStatus("success");
          setMessage("Fingerprint verified!");
          if (mode === "login") {
            try {
              const { getDeviceToken } = await import('@/lib/deviceToken');
              const deviceToken = await getDeviceToken();
              const userId = localStorage.getItem('biovault_userId');
              if (!userId || !deviceToken) throw new Error('User not authorized. Please register first.');
              const result = await validateUser(userId, deviceToken);
              if (result.authorized) {
                setTimeout(onSuccess, SUCCESS_HOLD_MS);
              } else {
                throw new Error(result.reason || 'User not authorized');
              }
            } catch (e: any) {
              const msg = (e?.message || '').toString();
              const friendly = msg || 'User not authorized. Please register first.';
              setStatus('error');
              setMessage(friendly);
              onError?.(friendly);
              setTimeout(() => setStatus('idle'), 3000);
            }
          } else {
            setTimeout(onSuccess, SUCCESS_HOLD_MS);
          }
        }
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Fingerprint scan failed");
      onError?.(err.message);
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

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono tracking-wide text-muted-foreground/90">
          <span className="px-2 py-1 rounded bg-background/60 border border-border/60">BIOMETRIC SENSOR</span>
          <span className="px-2 py-1 rounded bg-background/60 border border-border/60">
            {status === "scanning" ? "SCANNING" : status === "success" ? "VERIFIED" : status === "error" ? "FAILED" : "READY"}
          </span>
        </div>

        <motion.div
          className={`relative mx-auto mt-9 w-[170px] h-[170px] rounded-full glass-surface flex items-center justify-center overflow-hidden ${
            status === "success" ? "ring-4 ring-neon-green/70" : status === "error" ? "ring-4 ring-destructive/70" : "ring-2 ring-primary/30"
          }`}
          animate={status === "scanning" ? { scale: [1, 1.03, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
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

          {status === "scanning" && (
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
