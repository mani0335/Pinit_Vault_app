import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { FaceScanner } from "@/components/FaceScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";
import { appStorage } from "@/lib/storage";

type Step = "fingerprint" | "face" | "success";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>("fingerprint");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasNavigatedToDashboard, setHasNavigatedToDashboard] = useState(false);

  useEffect(() => {
    // Check if user has already registered (userId exists in Capacitor storage OR passed via navigation)
    const checkRegistration = async () => {
      try {
        // FIRST: Check if userId was passed from Register page (via navigation state)
        const passedUserId = (location.state as any)?.userId;
        if (passedUserId) {
          console.log('✅ Login: userId passed from Register:', passedUserId);
          // CRITICAL: Save passed userId to storage for future sessions
          await appStorage.setItem("biovault_userId", passedUserId);
          localStorage.setItem("biovault_userId", passedUserId);
          console.log('💾 Login: Saved passed userId to both storages');
          setUserId(passedUserId);
          setIsLoading(false);
          return;
        }

        // SECOND: Try to get userId from storage with retries
        let savedUserId = null;
        for (let i = 0; i < 8; i++) {
          savedUserId = await appStorage.getItem("biovault_userId");
          console.log(`📍 Login: Storage check attempt ${i + 1}:`, savedUserId);
          
          if (savedUserId) {
            console.log('✅ Login: User is registered with ID:', savedUserId);
            setUserId(savedUserId);
            setIsLoading(false);
            return;
          }
          
          // Wait before retry
          if (i < 7) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // FRESH USER: No userId found, but still allow biometric attempt
        // FingerprintScanner will trigger BiometricOptions on failure
        console.log('📝 Login: Fresh user detected, allowing biometric attempt');
        setUserId(null); // Explicitly set to null for fresh users
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Login: Error checking registration:', err);
        // Still allow biometric attempt on error
        setUserId(null);
        setIsLoading(false);
      }
    };
    
    checkRegistration();
  }, [location.state, navigate]);

  const onShieldTap = async () => {
    console.log("👆 SHIELD TAPPED");
    try {
      const uid = userId || "";
      const result = await verifyFingerprintBackend(uid);
      
      if (result.verified) {
        console.log("✅ FP VERIFIED");
        setFingerVerified(true);
        setUserId(result.userId || uid);
        setStep("face");
      } else {
        console.log("❌ FP FAILED");
        setStep("error");
        setErrorMsg("Fingerprint not recognized");
      }
    } catch (err) {
      console.error("❌ ERROR:", err);
      setStep("error");
      setErrorMsg("Verification failed");
    }
  };

  const onFaceSuccess = async () => {
    console.log("👤 FACE SUCCESS");
    try {
      if (!userId) throw new Error("No userId");
      await appStorage.setItem("biovault_userId", userId);
      localStorage.setItem("biovault_userId", userId);
      const token = `verified_${userId}`;
      await appStorage.setItem("biovault_token", token);
      localStorage.setItem("biovault_token", token);
      setStep("success");
      await new Promise(r => setTimeout(r, 1200));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("❌ FACE ERROR:", err);
      setErrorMsg("Error: " + String(err));
      setStep("error");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <HexGrid />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-4 md:py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Back */}
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

          {/* Steps indicator - Only Fingerprint and Face */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {["fingerprint", "face"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border ${
                  step === s ? "bg-primary/20 border-primary text-primary" :
                  ((s === "fingerprint" && (step === "face" || step === "success")) || (s === "face" && step === "success")) ? "bg-neon-green/20 border-neon-green text-neon-green" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {((s === "fingerprint" && (step === "face" || step === "success")) || (s === "face" && step === "success")) ? "✓" : i + 1}
                </div>
                {i < 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* Content */}
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-surface rounded-2xl p-6 md:p-8 border border-primary/20 text-center py-8"
            >
              <h2 className="text-lg font-display tracking-wider text-foreground mb-2">LOADING BIOMETRIC DATA</h2>
              <p className="text-muted-foreground font-mono text-sm">Verifying registered user...</p>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-surface rounded-2xl p-6 md:p-8 border border-primary/20"
            >
              {step === "fingerprint" && (
              <div>
                <FingerprintScanner
                  mode="login"
                  required={true}
                  userId={userId || undefined}
                  onSuccess={() => {
                    console.log('✅ Fingerprint verified - proceeding to face authentication');
                    setStep("face");
                  }}
                  onError={(err) => {
                    console.log('❌ Fingerprint authentication error:', err);
                    const msg = (err || '').toString().toLowerCase();
                    
                    // ✅ FLOW FIX: Fingerprint not in backend or not registered
                    // Route to BiometricOptions with Register + Temp Access buttons
                    // User can choose to register or use temporary access
                    console.log('⚠️ Fingerprint not found in backend - showing registration options');
                    console.log('   Error was:', msg);
                    navigate('/biometric-options');
                  }}
                />
              </div>
            )}

            {step === "face" && (
              <div>
                <Button variant="ghost" className="mb-4 text-xs" onClick={() => setStep("fingerprint")}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <FaceScanner
                  mode="login"
                  userId={userId}
                  onSuccess={async (faceData) => {
                    // CRITICAL: Prevent multiple navigations
                    if (hasNavigatedToDashboard) {
                      console.log('⚠️ Already navigating to dashboard, ignoring duplicate success');
                      return;
                    }
                    
                    console.log('✅✅✅ FACE AUTHENTICATION SUCCESSFUL!');
                    console.log('✅ FaceScanner verified face, userId:', userId);
                    setHasNavigatedToDashboard(true);
                    setStep("success");
                    
                    // ✅ NAVIGATE TO DASHBOARD WITH TOKEN VALIDATION
                    // FaceScanner has already saved tokens from backend before calling onSuccess
                    console.log('🚀🚀🚀 NAVIGATING TO DASHBOARD NOW');
                    console.log('🔐 Tokens already saved by FaceScanner - proceeding to Dashboard');
                    
                    setTimeout(async () => {
                      // CRITICAL: Verify tokens exist before navigation
                      try {
                        let token = await appStorage.getItem("biovault_token");
                        if (!token) {
                          token = localStorage.getItem("biovault_token");
                        }
                        
                        if (!token) {
                          console.error('❌ CRITICAL: No token found - cannot navigate to dashboard');
                          console.error('🔄 Falling back to retry fingerprint');
                          setStep("fingerprint");
                          setHasNavigatedToDashboard(false);
                          return;
                        }
                        
                        console.log('✅ Token validation passed - navigating to /dashboard');
                        console.log('🎯 Navigation triggered with valid token');
                        navigate("/dashboard", { replace: true });
                      } catch (err) {
                        console.error('❌ Error validating token:', err);
                        setStep("fingerprint");
                        setHasNavigatedToDashboard(false);
                      }
                    }, 1800);  // Increased delay to ensure FaceScanner's token persistence completes
                  }}
                  onError={() => {
                    console.log('❌ Face authentication failed');
                    // ✅ FIXED: Don't redirect on face failure
                    // User is already authenticated with fingerprint
                    // Face verification just failed (lighting, angle, etc.)
                    // Let user retry without redirecting to BiometricOptions
                    console.log('🔐 User is registered and fingerprint verified');
                    console.log('❌ Face verification failed - allowing retry');
                    // Stay on face page - no redirect, let user retry
                  }}
                />
              </div>
            )}

            {step === "success" && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-neon-green/10 border-2 border-neon-green flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <h2 className="text-xl font-display tracking-wider text-neon-green mb-2">ACCESS GRANTED</h2>
                <p className="text-muted-foreground font-mono text-sm">Redirecting to dashboard...</p>
              </motion.div>
            )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
