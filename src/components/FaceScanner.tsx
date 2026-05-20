import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera as CameraIcon, CheckCircle, XCircle, ScanFace } from "lucide-react";
import { ScanEffect } from "./ScanEffect";
import { Button } from "./ui/button";
import { verifyFace, verifyFaceBackend } from "@/lib/authService";
import { appStorage } from "@/lib/storage";
import { detectFaceInVideo, loadFaceDetectionModel, faceEuclideanDistance } from "@/lib/faceDetection";

interface FaceScannerProps {
  onSuccess: (faceData?: number[]) => void;
  onError?: (error: string) => void;
  mode: "register" | "login" | "temp-access";
  required?: boolean;
  userId?: string; // ADD: Optional userId prop for login mode
}

export function FaceScanner({ onSuccess, onError, mode, required = false, userId: propUserId }: FaceScannerProps) {
  const [status, setStatus] = useState<"idle" | "camera" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasAutoStarted = useRef(false);

  const PROCESSING_MS = 900;
  const SUCCESS_HOLD_MS = 1200;

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

    // Shared: holds the face-api.js 128-dim descriptor captured during detection
    let lastDescriptor: Float32Array | null = null;

    // FOR REGISTRATION: Properly detect face presence first
    if (mode === "register") {
      console.log('🔍 REGISTRATION MODE: Starting proper face detection...');
      let faceDetected = false;
      let detectionAttempts = 0;
      const maxDetectionAttempts = 75;
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
            lastDescriptor = faceDetection.descriptor;
            const eyeMsg = faceDetection.irisVisible ? ' · Iris detected ✓' : faceDetection.eyesOpen ? ' · Eyes open ✓' : '';
            setMessage(`✓ Face detected (${Math.round(faceDetection.confidence * 100)}%)${eyeMsg}`);
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
            lastDescriptor = faceDetection.descriptor;
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

    // Use the 128-dim descriptor captured during detection (face-api.js recognition net)
    const embedding = lastDescriptor ? Array.from(lastDescriptor) : null;

    if (!embedding) {
      setStatus("error");
      setMessage("❌ Unable to capture face profile. Please ensure your face is well-lit and clearly visible.");
      onError?.("Face capture failed");
      setTimeout(() => {
        setStatus("camera");
        setMessage("Align your face inside the frame");
      }, 1500);
      return;
    }

    if (mode === "login") {
      try {
        // Use userId passed as prop first (from Register state), fallback to storage
        let userId = propUserId;
        if (!userId) {
          userId = await appStorage.getItem("biovault_userId");
        }
        if (!userId) throw new Error("User not registered on this device.");

        console.log('🔐 FaceScanner: Starting face verification for userId:', userId, '(from', propUserId ? 'prop' : 'storage', ')');
        
        // First, get stored face embedding from backend
        const API_BASE = process.env.REACT_APP_BACKEND_URL || "https://biovault-backend-d13a.onrender.com";
        const biometricResponse = await fetch(`${API_BASE}/api/user/check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ user_id: userId })
        });

        if (!biometricResponse.ok) {
          throw new Error("Failed to check user biometrics");
        }

        const biometricData = await biometricResponse.json();
        console.log('🔍 FaceScanner: Backend biometric data:', biometricData);

        if (!biometricData.ok || !biometricData.faceRegistered) {
          throw new Error("No face biometrics found for this user");
        }

        // Get stored face embedding (assuming backend returns it)
        // Note: You may need to modify the backend to return the face_embedding
        const storedEmbedding = biometricData.faceEmbedding || biometricData.face_embedding;
        
        if (!storedEmbedding || !Array.isArray(storedEmbedding)) {
          throw new Error("No valid face embedding found in backend");
        }

        console.log('📊 FaceScanner: Comparing face with stored embedding');
        console.log('   - Current embedding length:', embedding.length);
        console.log('   - Stored embedding length:', storedEmbedding.length);

        // Euclidean distance on face-api.js 128-dim descriptors
        // Same person: 0.0–0.45 | Different people: 0.6–1.2 | Threshold: 0.5
        const distance = faceEuclideanDistance(embedding, storedEmbedding);
        const DISTANCE_THRESHOLD = 0.5;
        const isMatch = distance <= DISTANCE_THRESHOLD;
        const similarity = Math.max(0, Math.min(1, 1 - distance / DISTANCE_THRESHOLD));

        console.log('📊 FaceScanner: Face distance:', distance.toFixed(4), '| Match:', isMatch);

        if (isMatch) {
          const token = `face_verified_${userId}_${Date.now()}`;
          const refreshToken = `refresh_${userId}_${Date.now()}`;

          await appStorage.setItem("biovault_token", token);
          localStorage.setItem("biovault_token", token);
          await appStorage.setItem("biovault_refresh_token", refreshToken);
          localStorage.setItem("biovault_refresh_token", refreshToken);

          console.log('✅ FaceScanner: Face verified, distance:', distance.toFixed(4));
          setStatus("success");
          setMessage(`✓ Face verified (${Math.round(similarity * 100)}% match)`);
          stopCamera();
          setCameraReady(false);

          setTimeout(() => onSuccess({ embedding } as any), SUCCESS_HOLD_MS);
          return;
        } else {
          // If distance is very large (>1.2), likely an old pixel-based embedding format
          const hint = distance > 1.2
            ? " Your face data uses an old format — please re-register your face in Settings."
            : " Try again with better lighting or re-register your face.";
          throw new Error(`Face does not match stored biometrics.${hint}`);
        }
      } catch (err: any) {
        const msg = (err?.message || "").toString();
        const displayMessage = msg || "Face authentication failed. Please try again.";
        
        console.error('❌ FaceScanner: EXCEPTION in login mode:', {
          message: msg,
          stack: err?.stack,
          displayMessage
        });
        
        setStatus("error");
        setMessage(displayMessage);
        onError?.(displayMessage || "Face authentication failed");
        
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
  }, [SUCCESS_HOLD_MS, cameraReady, mode, onError, onSuccess, propUserId, stopCamera]);

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
