import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FaceScanner } from "@/components/FaceScanner";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";
import { appStorage } from "@/lib/storage";
import { requestTempCode, verifyTempCode, rebindDevice } from "@/lib/authService";

type Step = "face" | "success" | "error";

const TempAccess = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("face");
  const [message, setMessage] = useState<string>("Scan your face to access your account");
  const [userId, setUserId] = useState<string | null>(null);

  const handleFaceSuccess = async (faceData: any) => {
    // Extract face embedding from wrapped object
    const faceEmbedding = faceData?.embedding || faceData || null;
    
    console.log("🔍 TempAccess: Face scan successful");
    console.log("📊 Embedding length:", faceEmbedding?.length || 0);
    
    if (!faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      console.error("❌ TempAccess: No face embedding");
      setMessage("❌ Face not captured properly. Please try again.");
      setStep("error");
      return;
    }

    try {
      setMessage("🔍 Searching database for your face...");
      
      // Call backend to search all users and find matching face
      const apiUrl = (import.meta.env.VITE_API_URL || "https://biovault-backend-d13a.onrender.com").trim();
      console.log("🌐 API URL:", apiUrl);
      
      const requestBody = {
        faceEmbedding: faceEmbedding,
        userId: null  // No userId = search all users
      };
      
      console.log("📤 Sending temp access request:", requestBody);
      
      const resp = await fetch(`${apiUrl}/auth/verify-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await resp.json();
      
      console.log("📥 Backend response:", data);
      
      if (data.verified && data.userId) {
        console.log("✅ TempAccess: User identified -", data.userId);
        setUserId(data.userId);
        setMessage(`✅ Welcome back, ${data.userId}!`);
        setStep("success");
        
        // Save tokens and redirect
        if (data.token) {
          localStorage.setItem("biovault_token", data.token);
          console.log("💾 Access token saved");
        }
        if (data.refreshToken) {
          localStorage.setItem("biovault_refresh_token", data.refreshToken);
          console.log("💾 Refresh token saved");
        }
        
        // Redirect to dashboard after brief success message
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1000);
      } else {
        console.error("❌ TempAccess: Verification failed -", data.message);
        setMessage(`❌ ${data.message || "Face not found in database"}`);
        setStep("error");
      }
    } catch (err: any) {
      console.error("❌ TempAccess: Error -", err);
      setMessage(`❌ Error: ${err.message || "Failed to identify face"}`);
      setStep("error");
    }
  };

  const handleFaceError = () => {
    setMessage("❌ Face scan failed. Please try again.");
    setStep("error");
  };

  const handleRetry = () => {
    setStep("face");
    setMessage("Scan your face to access your account");
  };

  const labels = ["FACE", "SUCCESS"];
  const idxByStep: Record<Step, number> = {
    face: 0,
    success: 1,
    error: 1,
  };
  const current = idxByStep[step];

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
            <StatusIndicator status="warning" label="Face Authentication" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {labels.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border ${
                  i === current ? "bg-accent/20 border-accent text-accent" :
                  i < current ? "bg-neon-green/20 border-neon-green text-neon-green" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {i < current ? "✓" : s[0]}
                </div>
                {i < labels.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-surface rounded-xl p-8">
            {step === "face" && (
              <div>
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">SCAN YOUR FACE</h2>
                <p className="text-xs text-muted-foreground font-mono text-center mb-4">{message}</p>
                <FaceScanner mode="login" onSuccess={handleFaceSuccess} onError={handleFaceError} />
              </div>
            )}

            {step === "success" && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-accent" />
                </div>
                <h2 className="text-xl font-display tracking-wider text-accent mb-2">IDENTIFIED</h2>
                <p className="text-muted-foreground font-mono text-sm mb-6">{message}</p>
                <p className="text-xs text-muted-foreground">Redirecting to your vault...</p>
              </motion.div>
            )}

            {step === "error" && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✕</span>
                </div>
                <p className="text-sm font-mono text-destructive mb-6">{message}</p>
                <Button variant="cyber-secondary" onClick={handleRetry}>Try Again</Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TempAccess;
