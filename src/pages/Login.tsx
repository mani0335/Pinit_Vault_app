import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, ChevronRight, AlertCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { FaceScanner } from "@/components/FaceScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";
import { appStorage } from "@/lib/storage";
import { verifyFingerprintBackend, verifyFaceBackend } from "@/lib/authService";

type Step = "fingerprint" | "face" | "success" | "error";

interface VerificationState {
  step: Step;
  userId: string | null;
  fingerprintVerified: boolean;
  errorMessage: string | null;
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [verification, setVerification] = useState<VerificationState>({
    step: "fingerprint",
    userId: null,
    fingerprintVerified: false,
    errorMessage: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if app is starting fresh
    const initializeApp = async () => {
      try {
        // Show loading/splash screen briefly
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Init error:', err);
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  const handleFingerprintSuccess = async () => {
    console.log('✅ Fingerprint scanned locally - now verifying with backend');
    setVerification(prev => ({ ...prev, step: "fingerprint", errorMessage: null }));
    
    // Get userId from storage
    let userId: string | null = null;
    try {
      userId = await appStorage.getItem("biovault_userId");
    } catch (err) {
      console.error('❌ Failed to get userId from storage:', err);
    }

    if (!userId) {
      console.log('❌ No userId in storage - redirecting to BiometricOptions');
      navigate('/biometric-options', { replace: true });
      return;
    }

    try {
      console.log('🔍 Verifying fingerprint with backend for userId:', userId);
      const result = await verifyFingerprintBackend(userId);
      
      if (result.verified) {
        console.log('✅ Fingerprint verified! Now proceed to face verification');
        setVerification(prev => ({
          ...prev,
          userId,
          fingerprintVerified: true,
          step: "face"
        }));
      } else {
        console.log('❌ Fingerprint not found in database:', result.message);
        // Fingerprint not in database - redirect to registration
        navigate('/biometric-options', { replace: true });
      }
    } catch (err: any) {
      console.error('❌ Fingerprint verification error:', err);
      setVerification(prev => ({
        ...prev,
        step: "fingerprint",
        errorMessage: "Fingerprint verification failed. Please try again."
      }));
    }
  };

  const handleFaceSuccess = async (faceData: any) => {
    console.log('✅ Face scanned locally - now verifying with backend');
    
    if (!verification.userId) {
      console.error('❌ No userId available for face verification');
      setVerification(prev => ({
        ...prev,
        step: "error",
        errorMessage: "Session error: No user ID. Please start over."
      }));
      return;
    }

    try {
      // Extract face embedding from faceData
      const faceEmbedding = faceData?.embedding || [];
      
      if (!Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
        console.error('❌ No face embedding provided');
        setVerification(prev => ({
          ...prev,
          step: "error",
          errorMessage: "Face embedding not captured. Please try again."
        }));
        return;
      }

      console.log('🔍 Verifying face with backend for userId:', verification.userId);
      console.log('📊 Embedding length:', faceEmbedding.length);
      
      const result = await verifyFaceBackend(faceEmbedding, verification.userId);
      
      if (result.verified) {
        console.log('✅ Face verified! Showing success and redirecting to dashboard');
        setVerification(prev => ({
          ...prev,
          step: "success"
        }));
        
        // Wait for animation then navigate
        await new Promise(resolve => setTimeout(resolve, 1500));
        navigate("/dashboard", { replace: true });
      } else {
        console.log('❌ Face not matched:', result.message);
        setVerification(prev => ({
          ...prev,
          step: "error",
          errorMessage: result.message || "Face not matched. Please try again."
        }));
      }
    } catch (err: any) {
      console.error('❌ Face verification error:', err);
      setVerification(prev => ({
        ...prev,
        step: "error",
        errorMessage: "Face verification failed. Please try again."
      }));
    }
  };

  const handleFaceError = () => {
    console.log('❌ Face capture failed - allowing retry');
    // Optionally show error but stay on face screen for retry
  };

  const handleRetry = () => {
    setVerification(prev => ({
      ...prev,
      step: "fingerprint",
      errorMessage: null,
      fingerprintVerified: false
    }));
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <HexGrid />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-4 md:py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Back Button */}
          <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-display font-bold tracking-wider text-foreground text-glow-cyan">
                LOGIN
              </h1>
            </div>
            <StatusIndicator status="scanning" label="Biometric Verification" />
          </div>

          {/* Steps Indicator */}
          {verification.step !== "error" && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {["fingerprint", "face"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border ${
                    verification.step === s ? "bg-primary/20 border-primary text-primary" :
                    ((s === "fingerprint" && (verification.step === "face" || verification.step === "success")) || 
                     (s === "face" && verification.step === "success")) ? "bg-neon-green/20 border-neon-green text-neon-green" :
                    "bg-muted border-border text-muted-foreground"
                  }`}>
                    {((s === "fingerprint" && (verification.step === "face" || verification.step === "success")) || 
                      (s === "face" && verification.step === "success")) ? "✓" : i + 1}
                  </div>
                  {i < 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-surface rounded-2xl p-6 md:p-8 border border-primary/20 text-center py-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
              />
              <h2 className="text-lg font-display tracking-wider text-foreground mb-2">INITIALIZING</h2>
              <p className="text-muted-foreground font-mono text-sm">Loading biometric authentication...</p>
            </motion.div>
          ) : verification.step === "error" ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-surface rounded-2xl p-6 md:p-8 border border-accent/40 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-lg font-display tracking-wider text-foreground mb-2">VERIFICATION FAILED</h2>
              <p className="text-muted-foreground font-mono text-sm mb-6">{verification.errorMessage}</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleRetry}>
                  Retry
                </Button>
                <Button variant="cyber" className="flex-1" onClick={() => navigate('/biometric-options', { replace: true })}>
                  Register
                </Button>
              </div>
            </motion.div>
          ) : verification.step === "success" ? (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-surface rounded-2xl p-6 md:p-8 border border-neon-green/40 text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full bg-neon-green/10 border-2 border-neon-green flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-3xl">✓</span>
              </motion.div>
              <h2 className="text-xl font-display tracking-wider text-neon-green mb-2">VERIFIED</h2>
              <p className="text-muted-foreground font-mono text-sm">Redirecting to dashboard...</p>
            </motion.div>
          ) : (
            <motion.div
              key={verification.step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="glass-surface rounded-2xl p-6 md:p-8 border border-primary/20"
            >
              {verification.step === "fingerprint" && (
                <div>
                  <h2 className="text-xl md:text-2xl font-display tracking-wide text-center mb-6 text-foreground">
                    Fingerprint Verification
                  </h2>
                  <FingerprintScanner
                    mode="login"
                    required={true}
                    onSuccess={handleFingerprintSuccess}
                    onError={(err) => {
                      console.log('❌ Fingerprint scan error:', err);
                      setVerification(prev => ({
                        ...prev,
                        step: "error",
                        errorMessage: "Fingerprint scan failed. Please try again."
                      }));
                    }}
                  />
                </div>
              )}

              {verification.step === "face" && (
                <div>
                  <h2 className="text-xl md:text-2xl font-display tracking-wide text-center mb-6 text-foreground">
                    Face Verification
                  </h2>
                  <FaceScanner
                    mode="login"
                    onSuccess={handleFaceSuccess}
                    onError={handleFaceError}
                  />
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
