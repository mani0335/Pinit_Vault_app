import { useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { isBiometricAvailable, showBiometricPrompt } from "@/lib/biometric";
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

export function FingerprintScanner({ onSuccess, onError, mode }: FingerprintScannerProps) {
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
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
                const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const resp = await fetch(`${API_BASE}/api/validate`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, deviceToken }),
                });
                let data: any = {};
                try { data = await resp.json(); } catch (e) { /* ignore parse errors */ }
                if (resp.ok && data.authorized) {
                  setTimeout(onSuccess, 1500);
                  return;
                } else {
                  throw new Error(data.reason || `User not authorized. Server responded ${resp.status}`);
                }
              } catch (e: any) {
                setStatus('error');
                setMessage(e.message || 'User not authorized. Please register first.');
                onError?.(e.message || 'User not authorized');
                setTimeout(() => setStatus('idle'), 3000);
                return;
              }
            }
            setTimeout(onSuccess, 1500);
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
          setTimeout(onSuccess, 1500);
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
              const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
              const resp = await fetch(`${API_BASE}/api/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, deviceToken }),
              });
              let data: any = {};
              try { data = await resp.json(); } catch (e) { /* ignore parse errors */ }
              if (resp.ok && data.authorized) {
                setTimeout(onSuccess, 1500);
              } else {
                throw new Error(data.reason || `User not authorized. Server responded ${resp.status}`);
              }
            } catch (e: any) {
              setStatus('error');
              setMessage(e.message || 'User not authorized. Please register first.');
              onError?.(e.message);
              setTimeout(() => setStatus('idle'), 3000);
            }
          } else {
            setTimeout(onSuccess, 1500);
          }
        }
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Fingerprint scan failed");
      onError?.(err.message);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [mode, onSuccess, onError]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold">Fingerprint</h3>

      <div className="relative w-48 h-48">
        <div className={`absolute inset-0 rounded-full p-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500`} />
        <motion.div
          className={`relative w-full h-full rounded-full glass-surface flex items-center justify-center overflow-hidden ${
            status === "success" ? "ring-4 ring-neon-green/60" : status === "error" ? "ring-4 ring-destructive/60" : "ring-2 ring-primary/20"
          }`}
          animate={status === "scanning" ? { scale: [1, 1.03, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ScanEffect type="fingerprint" active={status === "scanning"} />
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <CheckCircle className="w-18 h-18 text-neon-green" />
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
      </div>

      <div className="w-56 flex flex-col items-center gap-2">
        <p className="text-muted-foreground font-mono text-sm text-center">{message || "Ready to scan"}</p>

        <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
          <div
            className={`h-full bg-neon-green ${status === "scanning" ? "animate-pulse" : ""}`}
            style={{ width: status === "scanning" ? "70%" : status === "success" ? "100%" : "0%" }}
          />
        </div>

        <div className="flex items-center gap-2">
          {status === "idle" && (
            <Button variant="cyber" onClick={startScan}>
              {mode === "register" ? "Register Fingerprint" : "Verify Fingerprint"}
            </Button>
          )}

          {status === "scanning" && (
            <Button variant="outline" size="sm" onClick={cancelScan}>
              Cancel
            </Button>
          )}

          {status === "error" && (
            <Button variant="outline" size="sm" onClick={() => setStatus("idle")}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
