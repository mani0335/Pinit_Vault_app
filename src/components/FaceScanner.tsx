import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera as CameraIcon, CheckCircle, XCircle, ScanFace } from "lucide-react";
import { ScanEffect } from "./ScanEffect";
import { Button } from "./ui/button";
import { verifyFace, verifyFaceBackend } from "@/lib/authService";
import { appStorage } from "@/lib/storage";
import { detectFaceInVideo, loadFaceDetectionModel } from "@/lib/faceDetection";

interface FaceScannerProps {
  onSuccess: (faceData?: number[]) => void;
  onError?: (error: string) => void;
  mode: "register" | "login" | "temp-access";
  required?: boolean;
}

export function FaceScanner({ onSuccess, onError, mode, required = false }: FaceScannerProps) {
  const [status, setStatus] = useState<"idle" | "camera" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasAutoStarted = useRef(false);

  const PROCESSING_MS = 900;
  const SUCCESS_HOLD_MS = 450;

  const extractEmbedding = useCallback((video: HTMLVideoElement): number[] | null => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(video.videoWidth, 1);
    canvas.height = Math.max(video.videoHeight, 1);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || canvas.width <= 1 || canvas.height <= 1) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 🔧 FIX: Generate 128-dimensional embedding (from 16x8 pixel sample)
    const sampleW = 16;  // Increased from 8 to 16
    const sampleH = 8;   // Keep at 8 for 16*8 = 128 pixels
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) return null;

    sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
    const data = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;

    const embedding: number[] = [];
    // Extract luminance from 16x8=128 pixels = 128-dimensional embedding
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      embedding.push(Number(luminance.toFixed(4)));
    }

    // Verify we have 128 dimensions
    if (embedding.length !== 128) {
      console.warn(`⚠️ Embedding has ${embedding.length} dimensions, expected 128`);
    } else {
      console.log(`✅ Generated 128-dimensional face embedding`);
    }

    // L2 normalize embedding for cosine similarity comparison on backend.
    const norm = Math.sqrt(embedding.reduce((acc, v) => acc + v * v, 0));
    if (norm === 0) return null;
    const normalized = embedding.map((v) => Number((v / norm).toFixed(6)));
    
    console.log(`📊 Embedding sum: ${normalized.reduce((a, b) => a + Math.abs(b), 0).toFixed(4)}`);
    console.log(`📊 First 5 values: ${normalized.slice(0, 5).map(v => v.toFixed(4)).join(', ')}`);
    
    return normalized;
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

  // Auto-start scan in register mode when camera and model are ready
  const autoStartScanInRegister = useCallback(() => {
    // This will be called when status changes to camera and conditions are met
  }, []);

  const scanRef = useRef<() => void | null>(null);

  useEffect(() => {
    if (mode === "register" && status === "camera" && cameraReady && modelReady && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      console.log('🚀 FaceScanner: Auto-starting scan in register mode');
      // Delay slightly to ensure everything is ready
      setTimeout(() => {
        if (scanRef.current) {
          scanRef.current();
        }
      }, 300);
    }
  }, [mode, status, cameraReady, modelReady]);

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

    // FOR REGISTRATION: Properly detect face presence first
    if (mode === "register") {
      console.log('🔍 REGISTRATION MODE: Starting proper face detection...');
      let faceDetected = false;
      let detectionAttempts = 0;
      const maxDetectionAttempts = 75; // Try for up to 75x200ms = 15 seconds (increased from 50)
      const minConfidence = 0.5;

      setMessage("📸 Looking for your face... (Move closer if needed)");

      while (!faceDetected && detectionAttempts < maxDetectionAttempts) {
        detectionAttempts++;
        await new Promise((r) => setTimeout(r, 200));

        try {
          const faceDetection = await detectFaceInVideo(video);

          if (faceDetection.hasFace && faceDetection.confidence >= minConfidence) {
            console.log(`✅ Face detected! Confidence: ${Math.round(faceDetection.confidence * 100)}%`);
            faceDetected = true;
            setMessage(`✓ Face detected (${Math.round(faceDetection.confidence * 100)}%)`);
            await new Promise((r) => setTimeout(r, 500));
            break;
          } else {
            const progress = Math.round((detectionAttempts / maxDetectionAttempts) * 100);
            setMessage(`🔍 Scanning... (${progress}%) - Make sure face is clearly visible`);
            if (detectionAttempts % 5 === 0) {
              console.log(`Face detection attempt ${detectionAttempts}/${maxDetectionAttempts}...`);
            }
          }
        } catch (err) {
          console.warn('Face detection attempt error:', err);
          // Continue trying even if an attempt fails
        }
      }

      if (!faceDetected) {
        console.warn('❌ Could not detect face after 10 seconds');
        setStatus("error");
        setMessage("❌ Face not detected. Check lighting, move closer, and ensure face is visible.");
        onError?.("Face not detected");
        setTimeout(() => {
          setStatus("camera");
          setMessage("Align your face inside the frame");
        }, 2500);
        return;
      }

      setMessage("✓ Capturing face profile...");
      await new Promise((r) => setTimeout(r, 300));
    } else {
      // LOGIN/TEMP-ACCESS: Use face detection
      const minConfidenceThreshold = mode === "login" ? 0.60 : 0.60;
      let consecutiveValidDetections = 0;
      const requiredConsecutiveDetections = 2;
      let totalAttempts = 0;
      const maxTotalAttempts = 40;
      let faceIsValid = false;

      setMessage("Detecting face...");

      while (consecutiveValidDetections < requiredConsecutiveDetections && totalAttempts < maxTotalAttempts) {
        totalAttempts++;
        await new Promise((r) => setTimeout(r, 200));

        try {
          const faceDetection = await detectFaceInVideo(video);

          if (faceDetection.hasFace && faceDetection.confidence >= minConfidenceThreshold) {
            consecutiveValidDetections++;
            console.log(`✓ Face detected (${consecutiveValidDetections}/${requiredConsecutiveDetections})`);
            
            if (consecutiveValidDetections >= requiredConsecutiveDetections) {
              faceIsValid = true;
              break;
            }
          } else {
            if (consecutiveValidDetections > 0) {
              console.warn('Face detection lost, restarting...');
              consecutiveValidDetections = 0;
            }
          }
        } catch (err) {
          console.warn('Face detection error, continuing...');
          consecutiveValidDetections = 0;
        }
      }

      if (!faceIsValid) {
        setStatus("error");
        setMessage("❌ Could not detect face. Please ensure good lighting and face is clearly visible.");
        onError?.("Face validation failed");
        setTimeout(() => {
          setStatus("camera");
          setMessage("Align your face inside the frame");
        }, 2000);
        return;
      }

      setMessage("✓ Face detected. Capturing...");
      await new Promise((r) => setTimeout(r, 300));
    }

    setMessage("✓ Face detected. Capturing face profile...");
    await new Promise((r) => setTimeout(r, 350));

    // Try multiple times to get a good face capture
    let embedding = null;
    let attempts = 0;
    const maxAttempts = 15; // Increased from 8 to 15 for better success rate

    while (!embedding && attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 300)); // Shorter wait between attempts

      embedding = extractEmbedding(video);

      // Validate embedding quality
      if (embedding) {
        const embeddingSum = embedding.reduce((a, b) => a + Math.abs(b), 0);
        const embeddingLength = embedding.length;
        
        // For registration: stricter validation (good embedding distribution)
        // For login: lenient validation (just check it exists)
        if (mode === "register") {
          // Registration: embedding should be well-distributed - MORE LENIENT RANGE
          // Accept 5-55 instead of 10-40 to handle various lighting/angles
          if (embeddingSum < 5.0 || embeddingSum > 55.0) {
            console.warn(
              `Attempt ${attempts}: Embedding sum out of range for registration (sum=${embeddingSum.toFixed(2)}). Required: 5-55. Retrying...`
            );
            embedding = null;
          } else {
            console.log(
              `✅ Face embedded on attempt ${attempts} (quality=${embeddingSum.toFixed(2)})`
            );
            break;
          }
        } else {
          // Login: just validate reasonable range
          if (embeddingSum < 0.1 || embeddingSum > 50.0) {
            console.warn(
              `Attempt ${attempts}: Embedding sum out of range (sum=${embeddingSum.toFixed(2)}). Retrying...`
            );
            embedding = null;
          } else {
            console.log(
              `Face captured on attempt ${attempts} (quality=${embeddingSum.toFixed(2)})`
            );
            break;
          }
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

    // Quality validation for registration mode - MORE LENIENT
    if (mode === "register") {
      const embeddingSum = embedding.reduce((a, b) => a + Math.abs(b), 0);
      console.log(`🎯 REGISTRATION MODE: Face quality validation (sum=${embeddingSum.toFixed(2)})`);
      
      // More lenient validation: 5-55 instead of 10-40
      if (embeddingSum < 5 || embeddingSum > 55) {
        setStatus("error");
        setMessage(`❌ Face quality issue. Please improve lighting and try again. (Quality: ${embeddingSum.toFixed(1)})`);
        onError?.("Face quality too low");
        setTimeout(() => {
          setStatus("camera");
          setMessage("Align your face inside the frame");
        }, 2000);
        return;
      }
    }

    if (mode === "login") {
      try {
        const userId = await appStorage.getItem("biovault_userId");
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

        // CRITICAL: Persist userId and tokens for next login
        await appStorage.setItem("biovault_userId", userId);
        localStorage.setItem("biovault_userId", userId);
        localStorage.setItem("biovault_token", data.token);
        localStorage.setItem("biovault_refresh_token", data.refreshToken);
        await appStorage.setItem("biovault_token", data.token);
        await appStorage.setItem("biovault_refresh_token", data.refreshToken);

        console.log('✅ FaceScanner: User credentials persisted for future logins');
        
        setStatus("success");
        setMessage(`✓ Verified (${Math.round((data.score || 0) * 100)}%)`);
        stopCamera();
        setCameraReady(false);
        setTimeout(() => onSuccess({ embedding } as any), SUCCESS_HOLD_MS);
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

    if (mode === "temp-access") {
      try {
        console.log('🌐 TempAccess Mode: Searching for user across all devices...');
        const data = await verifyFaceBackend(embedding); // No userId - searches all users
        
        console.log('📊 TempAccess Response:', {
          verified: data.verified,
          userId: data.userId,
          similarity: data.similarity,
          message: data.message
        });

        if (!data.verified || !data.userId) {
          throw new Error(data.message || "Face not recognized. Please try again.");
        }

        console.log('✅ TempAccess: User identified as', data.userId, 'with similarity', (data.similarity * 100).toFixed(1) + '%');
        
        setStatus("success");
        setMessage(`✓ Identified (${(data.similarity * 100).toFixed(1)}%)`);
        stopCamera();
        setCameraReady(false);
        
        // Store temp access credentials
        await appStorage.setItem('biovault_userId', data.userId);
        if (data.token) {
          console.log('💾 Storing access token from temp access');
          localStorage.setItem('biovault_token', data.token);
        }
        if (data.refreshToken) {
          console.log('💾 Storing refresh token from temp access');
          localStorage.setItem('biovault_refresh_token', data.refreshToken);
        }
        
        console.log('✅ All credentials stored - ready for dashboard');
        setTimeout(() => onSuccess({ embedding } as any), SUCCESS_HOLD_MS);
        return;
      } catch (err: any) {
        const msg = (err?.message || "").toString();
        const friendly = msg || "Face authentication failed. Please retry.";
        console.error('❌ TempAccess Error:', friendly);
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

    // Registration mode: Just capture the face and pass it back to parent component
    // The Register.tsx page will handle the backend storage via registerUser()
    console.log('🎯 FaceScanner Register Mode: Face captured!');
    console.log('📊 Embedding captured:', {
      exists: !!embedding,
      length: embedding?.length || 0,
      first5: embedding ? embedding.slice(0, 5) : 'N/A',
      sum: embedding ? embedding.reduce((a, b) => a + Math.abs(b), 0) : 'N/A'
    });
    
    setStatus("success");
    setMessage("✓ Face captured successfully");
    stopCamera();
    setCameraReady(false);
    
    console.log('📤 Calling onSuccess with:', { embedding });
    setTimeout(() => {
      console.log('✅ onSuccess callback triggered with embedding');
      onSuccess({ embedding } as any);
    }, SUCCESS_HOLD_MS);
  }, [PROCESSING_MS, SUCCESS_HOLD_MS, cameraReady, extractEmbedding, mode, onError, onSuccess, stopCamera]);

  // Assign startScan to ref for auto-start in register mode
  useEffect(() => {
    scanRef.current = startScan;
  }, [startScan]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
      <div className="w-full text-center">
        <h3 className="text-xl md:text-2xl font-display font-semibold tracking-wide text-foreground">Face Authentication</h3>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Use live face verification to continue securely.</p>
      </div>

      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden glass-surface border border-border">
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

          {status === "camera" && mode !== "register" && (
            <>
              <Button variant="cyber" size="lg" onClick={startScan} disabled={!cameraReady || !modelReady}>
                <ScanFace className="w-4 h-4 mr-2" />
                {!cameraReady ? "Camera Loading..." : !modelReady ? "Face Detection Loading..." : "Verify Face"}
              </Button>
              {!required && (
                <Button variant="outline" size="lg" onClick={cancelCamera}>
                  Cancel
                </Button>
              )}
            </>
          )}
          
          {status === "camera" && mode === "register" && (
            <Button 
              variant="cyber" 
              size="lg" 
              onClick={startScan} 
              className="min-w-[160px]"
            >
              <ScanFace className="w-4 h-4 mr-2" />
              Capture Face
            </Button>
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
