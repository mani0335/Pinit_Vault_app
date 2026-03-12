import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FaceScanner } from "@/components/FaceScanner";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";

type Step = "face" | "fingerprint" | "success" | "failed";

const TempAccess = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("face");

  return (
    <div className="min-h-screen relative overflow-hidden">
      <HexGrid />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-display font-bold tracking-wider text-foreground">
                TEMP ACCESS
              </h1>
            </div>
            <StatusIndicator status="warning" label="Restricted Mode" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            {["FACE", "PRINT"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border ${
                  i === (step === "face" ? 0 : 1) ? "bg-accent/20 border-accent text-accent" :
                  i < (step === "face" ? 0 : 1) ? "bg-neon-green/20 border-neon-green text-neon-green" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {i < (step === "face" ? 0 : step === "fingerprint" ? 1 : 2) ? "✓" : s[0]}
                </div>
                {i < 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-surface rounded-xl p-8">
            {step === "face" && (
              <div>
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">FACE VERIFICATION</h2>
                <FaceScanner mode="login" onSuccess={() => setStep("fingerprint")} />
              </div>
            )}

            {step === "fingerprint" && (
              <div>
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">FINGERPRINT CHECK</h2>
                <FingerprintScanner mode="login" onSuccess={() => { setStep("success"); setTimeout(() => navigate("/dashboard?mode=temp"), 2000); }} />
              </div>
            )}

            {step === "success" && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-accent" />
                </div>
                <h2 className="text-xl font-display tracking-wider text-accent mb-2">TEMP ACCESS GRANTED</h2>
                <p className="text-muted-foreground font-mono text-sm">Limited privileges • No security changes</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TempAccess;
