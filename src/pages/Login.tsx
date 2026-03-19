import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { FaceScanner } from "@/components/FaceScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";

type Step = "userId" | "fingerprint" | "face" | "success";

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("userId");
  const [inputUserId, setInputUserId] = useState("");
  const [userIdError, setUserIdError] = useState("");

  const handleUserIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = inputUserId.trim();
    if (!id) {
      setUserIdError("Please enter your User ID");
      return;
    }
    // Store the userId and proceed
    localStorage.setItem("biovault_userId", id);
    setUserIdError("");
    setStep("fingerprint");
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

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {["userId", "fingerprint", "face"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border ${
                  step === s ? "bg-primary/20 border-primary text-primary" :
                  ((s === "userId" && step !== "userId") || (s === "fingerprint" && (step === "face" || step === "success")) || (s === "face" && step === "success")) ? "bg-neon-green/20 border-neon-green text-neon-green" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {((s === "userId" && step !== "userId") || (s === "fingerprint" && (step === "face" || step === "success")) || (s === "face" && step === "success")) ? "✓" : i + 1}
                </div>
                {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* Content */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-surface rounded-2xl p-6 md:p-8 border border-primary/20"
          >
            {step === "userId" && (
              <form onSubmit={handleUserIdSubmit} className="space-y-6">
                <div>
                  <h2 className="text-lg font-display tracking-wider text-center mb-2 text-foreground">ENTER USER ID</h2>
                  <p className="text-muted-foreground font-mono text-xs text-center mb-6">You received this ID during registration</p>
                </div>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    value={inputUserId}
                    onChange={(e) => {
                      setInputUserId(e.target.value);
                      setUserIdError("");
                    }}
                    placeholder="Enter your USER_ID"
                    className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 font-mono text-sm"
                    autoFocus
                  />
                  {userIdError && (
                    <p className="text-red-500 text-xs font-mono">{userIdError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-display tracking-wider"
                  disabled={!inputUserId.trim()}
                >
                  Continue to Fingerprint
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}

            {step === "fingerprint" && (
              <div>
                <FingerprintScanner
                  mode="login"
                  required={true}
                  onSuccess={() => setStep("face")}
                  onError={(err) => {
                    // route based on server reason: device mismatch -> temp access, user not registered -> register
                    try {
                      const msg = (err || '').toString().toLowerCase();
                      if (msg.includes('device mismatch')) {
                        // go to temp access flow
                        navigate('/temp-access');
                        return;
                      }
                      if (msg.includes('user not registered') || msg.includes('not registered') || msg.includes('not authorized')) {
                        navigate('/register');
                        return;
                      }
                    } catch (e) {
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
                  onSuccess={() => { setStep("success"); setTimeout(() => navigate("/dashboard"), 800); }}
                  onError={() => {
                    // Keep user in face step so they can retry immediately.
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
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
