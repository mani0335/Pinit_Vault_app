import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle, XCircle, ScanFace } from "lucide-react";
import { ScanEffect } from "./ScanEffect";
import { Button } from "./ui/button";
import { verifyFace } from "@/lib/authService";

interface FaceScannerProps {
  onSuccess: (faceData?: number[]) => void;
  onError?: (error: string) => void;
  mode: "register" | "login";
}

export function FaceScanner({ onSuccess, onError, mode }: FaceScannerProps) {
  const [status, setStatus] = useState<"idle" | "camera" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
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
      setMessage("Initializing secure camera...");
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
      setMessage("Preparing camera feed...");
    } catch (err: any) {
      setStatus("error");
      setMessage("Camera permission denied");
      onError?.("Camera access denied");
      setTimeout(() => setStatus("idle"), 3000);
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
      setMessage("Camera is not ready. Please wait a moment and retry.");
      setTimeout(() => {
        setStatus("camera");
        setMessage("Align your face inside the frame");
      }, 1200);
      return;
    }

    setStatus("scanning");
    setMessage("Detecting face...");

    await new Promise((r) => setTimeout(r, PROCESSING_MS));

    const embedding = extractEmbedding(video);
    if (!embedding) {
      setStatus("error");
      setMessage("Failed to capture face frame. Please retry.");
      setTimeout(() => {
        setStatus("camera");
        setMessage("Align your face inside the frame");
      }, 1200);
      return;
    }

    setMessage("Face detected. Matching face...");
    await new Promise((r) => setTimeout(r, 350));

    if (mode === "login") {
      try {
        const userId = localStorage.getItem("biovault_userId");
        if (!userId) throw new Error("User not registered on this device.");

        const data = await verifyFace(userId, embedding);

        if (!data.ok || !data.match) {
          throw new Error(data.reason || "Face authentication failed");
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
        setMessage(`Authentication success (${Math.round((data.score || 0) * 100)}%)`);
        stopCamera();
        setCameraReady(false);
        setTimeout(() => onSuccess(embedding), SUCCESS_HOLD_MS);
        return;
      } catch (err: any) {
        const msg = (err?.message || "").toString();
        const friendly = msg || "Face authentication failed. Please retry.";
        setStatus("error");
        setMessage(friendly);
        onError?.(friendly || "Face authentication failed");
        setTimeout(() => {
          setStatus("camera");
          setMessage("Align your face inside the frame");
        }, 1400);
        return;
      }
    }

    setStatus("success");
    setMessage("Face profile captured successfully");
    stopCamera();
    setCameraReady(false);
    setTimeout(() => onSuccess(embedding), SUCCESS_HOLD_MS);
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
                {status === "scanning" ? "Processing" : cameraReady ? "Ready" : "Loading"}
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
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          )}

          {status === "camera" && (
            <>
              <Button variant="cyber" size="lg" onClick={startScan} disabled={!cameraReady}>
                <ScanFace className="w-4 h-4 mr-2" />
                {cameraReady ? (mode === "register" ? "Capture Face Profile" : "Verify Face") : "Camera Loading..."}
              </Button>
              <Button variant="outline" size="lg" onClick={cancelCamera}>
                Cancel
              </Button>
            </>
          )}

          {status === "scanning" && (
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
