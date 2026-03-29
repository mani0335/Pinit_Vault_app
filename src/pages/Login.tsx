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
  const [notRegisteredError, setNotRegisteredError] = useState(false);
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
          setUserId(passedUserId);
          setIsLoading(false);
          return;
        }

        // SECOND: Try to get userId from storage with retries
        let savedUserId = null;
        for (let i = 0; i < 5; i++) {
          savedUserId = await appStorage.getItem("biovault_userId");
          console.log(`📍 Login: Storage check attempt ${i + 1}:`, savedUserId);
          
          if (savedUserId) {
            console.log('✅ Login: User is registered with ID:', savedUserId);
            setUserId(savedUserId);
            setIsLoading(false);
            return;
          }
          
          // Wait before retry
          if (i < 4) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        // Still no userId after retries - show biometric options
        console.log('❌ Login: No saved userId found - showing biometric options');
        navigate('/biometric-options', { replace: true });
      } catch (err) {
        console.error('❌ Login: Error checking registration:', err);
        // On error, show biometric options
        navigate('/biometric-options', { replace: true });
      }
    };
    
    checkRegistration();
  }, [location.state, navigate]);

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
          ) : notRegisteredError ? (
            <motion.div
              key="not-registered"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-surface rounded-2xl p-6 md:p-8 border border-accent/40 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-lg font-display tracking-wider text-foreground mb-2">NOT REGISTERED</h2>
              <p className="text-muted-foreground font-mono text-sm mb-6">No user account found. Please register first.</p>
              <Button variant="cyber" className="w-full" onClick={() => navigate('/register')}>
                Go to Registration
              </Button>
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
                  onSuccess={() => {
                    console.log('✅ Fingerprint verified - proceeding to face authentication');
                    setStep("face");
                  }}
                  onError={(err) => {
                    console.log('❌ Fingerprint authentication error:', err);
                    // Only redirect on VERY specific errors
                    const msg = (err || '').toString().toLowerCase();
                    
                    // SPECIAL: User not registered in database
                    if (msg.includes('redirect_to_register')) {
                      console.log('🔄 User account not found - showing biometric options');
                      navigate('/biometric-options', { replace: true });
                      return;
                    }
                    
                    // DEVICE MISMATCH - send to temp access
                    if (msg.includes('device mismatch')) {
                      console.log('🔄 Device mismatch detected - redirecting to temp access');
                      navigate('/temp-access', { replace: false });
                      return;
                    }
                    
                    // For other errors, STAY ON LOGIN PAGE and let user retry
                    // Do NOT redirect to /register - user is already registered!
                    console.log('⚠️ Fingerprint error but user is registered - staying on login for retry');
                  }}
                />
              </div>
            )}

            {step === "face" && (
              <div>
                <h2 className="text-xl md:text-2xl font-display tracking-wide text-center mb-6 text-foreground">Face Verification</h2>
                <FaceScanner
                  mode="login"
                  onSuccess={(faceData) => {
                    // CRITICAL: Prevent multiple navigations
                    if (hasNavigatedToDashboard) {
                      console.log('⚠️ Already navigating to dashboard, ignoring duplicate success');
                      return;
                    }
                    
                    console.log('✅ Face authentication successful - preparing dashboard navigation');
                    setHasNavigatedToDashboard(true);
                    setStep("success");
                    
                    // Wait for success animation, then navigate
                    setTimeout(() => {
                      console.log('🚀 NAVIGATING TO DASHBOARD NOW');
                      // Use absolute path and replace history to prevent going back
                      navigate("/dashboard", { replace: true });
                    }, 1500);
                  }}
                  onError={() => {
                    console.log('❌ Face authentication failed - allowing retry');
                    // Reset navigation flag to allow retry
                    setHasNavigatedToDashboard(false);
                    setStep("face");
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
