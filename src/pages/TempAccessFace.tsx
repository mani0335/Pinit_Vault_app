import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FaceScanner } from "@/components/FaceScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";
import { appStorage } from "@/lib/storage";

type Step = "face" | "success";

// Generate temporary user ID
function generateTempUserId(prefix: string = "TEMP") {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

const TempAccessFace = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("face");
  const [hasNavigatedToDashboard, setHasNavigatedToDashboard] = useState(false);
  const [tempUserId] = useState(() => generateTempUserId());

  // Save temp userId to storage immediately
  useEffect(() => {
    const saveTempUserId = async () => {
      try {
        console.log('💾 TempAccessFace: Saving temporary userId:', tempUserId);
        await appStorage.setItem('biovault_userId', tempUserId);
        console.log('✅ TempAccessFace: Temp userId saved to storage');
      } catch (err) {
        console.error('❌ TempAccessFace: Failed to save temp userId:', err);
      }
    };
    saveTempUserId();
  }, [tempUserId]);

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
              <Clock className="w-6 h-6 text-neon-green" />
              <h1 className="text-2xl font-display font-bold tracking-wider text-foreground text-glow-cyan">
                TEMPORARY ACCESS
              </h1>
            </div>
            <StatusIndicator status="scanning" label="Face Verification" />
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border ${
                step === "face" ? "bg-primary/20 border-primary text-primary" :
                (step === "success") ? "bg-neon-green/20 border-neon-green text-neon-green" :
                "bg-muted border-border text-muted-foreground"
              }`}>
                {(step === "success") ? "✓" : 1}
              </div>
            </div>
          </div>

          {/* Content */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-surface rounded-2xl p-6 md:p-8 border border-primary/20"
          >
            {step === "face" && (
              <div>
                
                <FaceScanner
                  mode="login"
                  onSuccess={(faceData) => {
                    // CRITICAL: Prevent multiple navigations
                    if (hasNavigatedToDashboard) {
                      console.log('⚠️ Already navigating to dashboard, ignoring duplicate success');
                      return;
                    }
                    
                    console.log('✅ Face authentication successful for temporary access');
                    setHasNavigatedToDashboard(true);
                    setStep("success");
                    
                    // Wait for success animation, then navigate with restricted flag
                    setTimeout(() => {
                      console.log('🚀 NAVIGATING TO DASHBOARD WITH TEMPORARY ACCESS');
                      navigate("/dashboard", { 
                        replace: true,
                        state: { tempAccess: true, restricted: true }
                      });
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

          {/* Info */}
          {step === "face" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 bg-neon-green/5 border border-neon-green/30 rounded-lg"
            >
              <p className="text-xs text-neon-green font-mono">
                ⓘ Temporary access is limited to read-only dashboard features. Complete registration for full access.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TempAccessFace;
