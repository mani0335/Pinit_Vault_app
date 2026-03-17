import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera as CameraIcon, CheckCircle, XCircle, ScanFace } from "lucide-react";
import { ScanEffect } from "./ScanEffect";
import { Button } from "./ui/button";
import { verifyFace } from "@/lib/authService";
import { detectFaceInVideo, loadFaceDetectionModel } from "@/lib/faceDetection";

interface FaceScannerProps {
  onSuccess: (faceData?: number[]) => void;
  onError?: (error: string) => void;
  mode: "register" | "login";
  required?: boolean;
}

export function FaceScanner({ onSuccess, onError, mode, required = false }: FaceScannerProps) {
  const [status, setStatus] = useState<"idle" | "camera" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const PROCESSING_MS = 900;
  const SUCCESS_HOLD_MS = 450;

  const extractEmbedding = useCallback((video: HTMLVideoElement): number[] | null => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(video.videoWidth, 1);
    canvas.height = Math.max(video.videoHeight, 1);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || canvas.width <= 1 || canvas.height <= 1) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const sampleW = 8;
    const sampleH = 8;
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) return null;

    sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
    const data = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;

    const embedding: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      embedding.push(Number(luminance.toFixed(4)));
    }

    // L2 normalize embedding for cosine similarity comparison on backend.
    const norm = Math.sqrt(embedding.reduce((acc, v) => acc + v * v, 0));
    if (norm === 0) return null;
    return embedding.map((v) => Number((v / norm).toFixed(6)));
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      setStatus("camera");
      setCameraReady(false);
      setModelReady(false);
      setMessage("Initializing secure camera and face detection...");
      
      // Request camera stream - this will prompt for permission on first access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Some WebViews will auto-play once metadata is ready.
        }
      }
      
      // Load face detection model
      try {
        await loadFaceDetectionModel();
        setModelReady(true);
        setMessage("Preparing camera feed and face detection...");
      } catch (err) {
        console.error("Face detection model load error:", err);
        setMessage("⚠️ Face detection unavailable. Please ensure stable internet connection.");
        // Allow camera to continue even if model fails to load
        setModelReady(false);
      }
    } catch (err: any) {
      setStatus("error");
      const errorMsg = err?.message || err?.name || "";
      if (errorMsg.includes("Permission") || errorMsg.includes("permission") || errorMsg.includes("NotAllowed")) {
        setMessage("❌ Camera permission denied. Please enable camera in app settings and retry.");
        onError?.("Camera permission denied");
      } else {
        setMessage("❌ Camera access failed. Please check device settings and retry.");
        onError?.("Camera access failed");
      }
      setTimeout(() => setStatus("idle"), 3500);
    }
  }, [onError]);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setCameraReady(false);
    setStatus("idle");
    setMessage("Camera closed");
  }, [stopCamera]);

  const startScan = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.readyState < 2) {
      setStatus("error");
      setMessage("❌ Camera is not ready. Please wait a moment and retry.");
      setTimeout(() => {
        setStatus("camera");
        setMessage("Align your face inside the frame");
      }, 1200);
      return;
    }

    setStatus("scanning");
    setMessage("Detecting face...");

    // Strict face validation - require consistent face detection
    let consecutiveValidDetections = 0;
    const requiredConsecutiveDetections = 2; // Reduced from 3 to 2 for easier detection
    let faceIsValid = false;
    let lastFaceError = "";
    let totalAttempts = 0;
    const maxTotalAttempts = 35; // Increased from 25 to 35 attempts
    let validatedFaceData = null;

    while (consecutiveValidDetections < requiredConsecutiveDetections && totalAttempts < maxTotalAttempts) {
      totalAttempts++;
      await new Promise((r) => setTimeout(r, 150));

      // Use face detection to validate that only a face is in the frame
      const faceDetection = await detectFaceInVideo(video);

      if (faceDetection.hasFace && faceDetection.confidence >= 0.40) {
        // Very lenient confidence threshold for real device conditions
        consecutiveValidDetections++;
        validatedFaceData = faceDetection;
        console.log(
          `✓ Valid face detected (${consecutiveValidDetections}/${requiredConsecutiveDetections}, confidence: ${Math.round(faceDetection.confidence * 100)}%)`
        );
        
        if (consecutiveValidDetections >= requiredConsecutiveDetections) {
          faceIsValid = true;
          break;
        }
      } else {
        // Reset counter if detection is not reliable
        if (consecutiveValidDetections > 0) {
          console.warn(`Face detection interrupted. Restarting validation...`);
          consecutiveValidDetections = 0;
        }
        lastFaceError = faceDetection.error || "Face validation failed";
      }
    }

    if (!faceIsValid) {
      setStatus("error");
      setMessage(
        `❌ Could not verify face. Make sure only your REAL FACE is visible. No walls, objects, or multiple faces.`
      );
      onError?.("Face validation failed - cannot detect a clear face");
      setTimeout(() => {
        setStatus("camera");
        setMessage("Align your face inside the frame");
      }, 2000);
      return;
    }

    setMessage("✓ Face detected. Capturing face profile...");
    await new Promise((r) => setTimeout(r, 350));

    // Try multiple times to get a good face capture
    let embedding = null;
    let attempts = 0;
    const maxAttempts = 8; // Increased attempts

    while (!embedding && attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 400)); // Shorter wait between attempts

      embedding = extractEmbedding(video);

      // Validate embedding quality - VERY lenient for real devices
      if (embedding) {
        const embeddingSum = embedding.reduce((a, b) => a + Math.abs(b), 0);
        // Accept almost any non-zero embedding (0.05 to 50.0 range)
        if (embeddingSum < 0.05 || embeddingSum > 50.0) {
          console.warn(
            `Attempt ${attempts}: Embedding sum out of range (sum=${embeddingSum.toFixed(2)}). Retrying...`
          );
          embedding = null;
        } else {
          console.log(
            `Face captured successfully on attempt ${attempts} (quality=${embeddingSum.toFixed(2)})`
          );
          break;
        }
      }
    }

    if (!embedding) {
      setStatus("error");
      setMessage(
        "❌ Unable to capture face profile. Please ensure your face is well-lit and clearly visible."
      );
      onError?.("Face capture failed");
      setTimeout(() => {
        setStatus("camera");
        setMessage("Align your face inside the frame");
      }, 1500);
      return;
    }

    if (mode === "login") {
      try {
        const userId = localStorage.getItem("biovault_userId");
        if (!userId) throw new Error("User not registered on this device.");

        const data = await verifyFace(userId, embedding);

        if (!data.ok || !data.match) {
          throw new Error(data.reason || "Face does not match registered profile. Please retry.");
        }
        if (!data.token) {
          throw new Error("Session token missing from server");
        }
        if (!data.refreshToken) {
          throw new Error("Refresh token missing from server");
        }

        localStorage.setItem("biovault_token", data.token);
        localStorage.setItem("biovault_refresh_token", data.refreshToken);

        setStatus("success");
        setMessage(`✓ Verified (${Math.round((data.score || 0) * 100)}%)`);
        stopCamera();
        setCameraReady(false);
        setTimeout(() => onSuccess(embedding), SUCCESS_HOLD_MS);
        return;
      } catch (err: any) {
        const msg = (err?.message || "").toString();
        const friendly = msg || "Face authentication failed. Please retry.";
        setStatus("error");
        setMessage('❌ ' + friendly);
        onError?.(friendly || "Face authentication failed");
        setTimeout(() => {
          setStatus("camera");
          setMessage("Align your face inside the frame");
        }, 1400);
        return;
      }
    }

    // Registration mode: Store face to database
    try {
      const { getDeviceToken } = await import('@/lib/deviceToken');
      const userId = localStorage.getItem('biovault_userId');
      const deviceToken = await getDeviceToken();
      
      if (!userId || !deviceToken) {
        throw new Error('User not properly initialized');
      }
      
      if (!embedding || !embedding.length) {
        throw new Error('No face embedding captured');
      }

      // Store face embedding to database
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';
      const response = await fetch(`${API_BASE}/api/register-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          deviceToken, 
          faceEmbedding: embedding,
          qualityScore: validatedFaceData?.confidence || 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register face in database');
      }

      setStatus("success");
      setMessage("✓ Face registered successfully");
      stopCamera();
      setCameraReady(false);
      setTimeout(() => onSuccess(embedding), SUCCESS_HOLD_MS);
      return;
    } catch (dbErr: any) {
      const msg = (dbErr?.message || 'Failed to register face').toString();
      setStatus('error');
      setMessage('❌ ' + msg);
      onError?.(msg);
      stopCamera();
      setCameraReady(false);
      setTimeout(() => {
        setStatus("camera");
        setMessage("Align your face inside the frame");
      }, 2000);
    }
  }, [PROCESSING_MS, SUCCESS_HOLD_MS, cameraReady, extractEmbedding, mode, onError, onSuccess, stopCamera]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
      <div className="w-full text-center">
        <h3 className="text-xl md:text-2xl font-display font-semibold tracking-wide text-foreground">Face Authentication</h3>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Use live face verification to continue securely.</p>
      </div>

      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden glass-surface border border-primary/35 shadow-[0_0_24px_hsl(var(--neon-glow)/0.15)]">
        {status === "idle" ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ScanFace className="w-10 h-10 text-primary opacity-80" />
            </div>
            <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedData={() => {
                setCameraReady(true);
                if (status === "camera") {
                  setMessage("Align your face inside the frame");
                }
              }}
            />
            <ScanEffect type="face" active={status === "scanning"} />

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs md:text-sm">
              <div className="px-2.5 py-1 rounded-full bg-background/70 border border-border/70 text-foreground/90">Live Camera</div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-background/70 border border-border/70 text-foreground/90">
                <span className={`w-2 h-2 rounded-full ${status === "scanning" ? "bg-primary animate-pulse" : "bg-neon-green"}`} />
                {status === "scanning" ? "Processing" : cameraReady && modelReady ? "Ready" : "Loading"}
              </div>
            </div>

            {/* Circular face overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-44 md:w-48 md:h-48 rounded-full border-2 border-primary/50 shadow-[0_0_24px_hsl(var(--neon-glow)/0.25)]" />
            </div>
          </>
        )}

        <AnimatePresence>
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-background/80 flex items-center justify-center"
            >
              <CheckCircle className="w-16 h-16 text-neon-green" />
            </motion.div>
          )}
          {status === "error" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-background/80 flex items-center justify-center"
            >
              <XCircle className="w-16 h-16 text-destructive" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full flex flex-col items-center gap-3">
        <p className="text-center text-sm md:text-base font-medium text-muted-foreground min-h-6">{message || "Ready for secure face authentication"}</p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          {status === "idle" && (
            <Button variant="cyber" size="lg" onClick={startCamera}>
              <CameraIcon className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          )}

          {status === "camera" && (
            <>
              <Button variant="cyber" size="lg" onClick={startScan} disabled={!cameraReady || !modelReady}>
                <ScanFace className="w-4 h-4 mr-2" />
                {!cameraReady ? "Camera Loading..." : !modelReady ? "Face Detection Loading..." : mode === "register" ? "Capture Face Profile" : "Verify Face"}
              </Button>
              {!required && (
                <Button variant="outline" size="lg" onClick={cancelCamera}>
                  Cancel
                </Button>
              )}
            </>
          )}

          {status === "scanning" && !required && (
            <Button variant="outline" size="lg" onClick={() => { setStatus("camera"); setMessage("Verification cancelled"); }}>
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
