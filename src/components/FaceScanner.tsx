import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle, XCircle, ScanFace } from "lucide-react";
import { ScanEffect } from "./ScanEffect";
import { Button } from "./ui/button";

interface FaceScannerProps {
  onSuccess: (faceData?: string) => void;
  onError?: (error: string) => void;
  mode: "register" | "login";
}

export function FaceScanner({ onSuccess, onError, mode }: FaceScannerProps) {
  const [status, setStatus] = useState<"idle" | "camera" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      setMessage("Initializing camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMessage("Position your face in the frame");
    } catch (err: any) {
      setStatus("error");
      setMessage("Camera access denied");
      onError?.("Camera access denied");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [onError]);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setStatus("idle");
    setMessage("Camera closed");
  }, [stopCamera]);

  const startScan = useCallback(async () => {
    setStatus("scanning");
    setMessage("Scanning face...");

    // Simulate face detection processing
    await new Promise((r) => setTimeout(r, 2500));

    // In production, you'd use face-api.js here for real face detection
    const success = Math.random() > 0.1; // 90% success rate simulation
    if (success) {
      setStatus("success");
      setMessage(mode === "register" ? "Face registered!" : "Face verified!");
      stopCamera();
      setTimeout(() => onSuccess("face-embedding-data"), 1500);
    } else {
      setStatus("error");
      setMessage("Face not recognized. Try again.");
      setTimeout(() => setStatus("camera"), 2000);
    }
  }, [mode, onSuccess, stopCamera]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold">Face Scan</h3>

      <div className="relative w-72 h-56 rounded-xl overflow-hidden glass-surface border-2 border-primary/30">
        {status === "idle" ? (
          <div className="w-full h-full flex items-center justify-center">
            <ScanFace className="w-16 h-16 text-primary opacity-50" />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <ScanEffect type="face" active={status === "scanning"} />

            {/* Circular face overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-44 rounded-full border-2 border-primary/40" />
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

      <div className="w-72 flex flex-col items-center gap-2">
        <p className="text-muted-foreground font-mono text-sm text-center">{message || "Ready for face scan"}</p>

        <div className="flex items-center gap-2">
          {status === "idle" && (
            <Button variant="cyber" onClick={startCamera}>
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          )}

          {status === "camera" && (
            <>
              <Button variant="cyber" onClick={startScan}>
                <ScanFace className="w-4 h-4 mr-2" />
                {mode === "register" ? "Capture Face" : "Verify Face"}
              </Button>
              <Button variant="outline" size="sm" onClick={cancelCamera}>
                Cancel
              </Button>
            </>
          )}

          {status === "scanning" && (
            <Button variant="outline" size="sm" onClick={() => { setStatus("camera"); setMessage("Scan cancelled"); }}>
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
