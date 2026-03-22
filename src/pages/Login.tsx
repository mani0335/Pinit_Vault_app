import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { FaceScanner } from "@/components/FaceScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";
import { appStorage } from "@/lib/storage";

type Step = "fingerprint" | "face" | "success";

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("fingerprint");
  const [isLoading, setIsLoading] = useState(true);
  const [notRegisteredError, setNotRegisteredError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has already registered (userId exists in Capacitor storage)
    const checkRegistration = async () => {
      try {
        let savedUserId = null;
        
        // Try to get userId with retries (in case it's still being persisted)
        for (let i = 0; i < 4; i++) {
          savedUserId = await appStorage.getItem("biovault_userId");
          console.log(`📍 Login: Check attempt ${i + 1} - userId:`, savedUserId);
          
          if (savedUserId) {
            console.log('✅ Login: User is registered with ID:', savedUserId);
            setUserId(savedUserId);
            setIsLoading(false);
            return;
          }
          
          // Wait before retry
          if (i < 3) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }
        
        // Still no userId after retries
        console.log('❌ Login: No saved userId found after retries');
        setNotRegisteredError(true);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Login: Error checking registration:', err);
        setNotRegisteredError(true);
        setIsLoading(false);
      }
    };
    
    checkRegistration();
  }, []);

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
                    // route based on server reason: device mismatch -> temp access, user not registered -> register
                    try {
                      const msg = (err || '').toString().toLowerCase();
                      if (msg.includes('device mismatch')) {
                        console.log('🔄 Device mismatch - redirecting to temp access');
                        // go to temp access flow
                        navigate('/temp-access');
                        return;
                      }
                      if (msg.includes('user not registered') || msg.includes('not registered') || msg.includes('not authorized') || msg.includes('user not found') || msg.includes('not found')) {
                        console.log('🔄 User not found - redirecting to register');
                        navigate('/register');
                        return;
                      }
                    } catch (e) {
                      console.error('🔄 Error in error handler - redirecting to register');
                      // fallback: send user to register
                      navigate('/register');
                    }
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
                    console.log('✅ Face authentication successful - navigating to dashboard');
                    setStep("success");
                    setTimeout(() => {
                      console.log('🚀 Redirecting to dashboard...');
                      navigate("/dashboard");
                    }, 1000);
                  }}
                  onError={() => {
                    console.log('❌ Face authentication failed - allowing retry');
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
