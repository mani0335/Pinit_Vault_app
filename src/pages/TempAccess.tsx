import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FaceScanner } from "@/components/FaceScanner";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";
import { requestTempCode, verifyTempCode, rebindDevice } from "@/lib/authService";

type Step = "code" | "face" | "fingerprint" | "update" | "success";

const TempAccess = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("Enter your temporary access code to continue");
  const [busy, setBusy] = useState(false);
  const userId = localStorage.getItem("biovault_userId");

  useEffect(() => {
    if (!userId) {
      navigate("/register");
      return;
    }

    const requestCode = async () => {
      try {
        const result = await requestTempCode(userId);
        if (result.ok && result.tempCode) {
          setIssuedCode(String(result.tempCode));
        }
      } catch (e) {
        // keep UI usable even if request fails
      }
    };

    requestCode();
  }, [navigate, userId]);

  const verifyCode = async () => {
    if (!userId || !code.trim()) {
      setMessage("Please enter a valid code");
      return;
    }
    setBusy(true);
    try {
      const result = await verifyTempCode(userId, code.trim());
      if (!result.ok) {
        throw new Error(result.reason || "Invalid temp code");
      }
      setMessage("Code verified. Register biometrics.");
      setStep("face");
    } catch (e: any) {
      setMessage(e?.message || "Code verification failed");
    } finally {
      setBusy(false);
    }
  };

  const rebindDevice = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const { getDeviceToken } = await import("@/lib/deviceToken");
      const deviceToken = await getDeviceToken();
      const result = await rebindDevice(userId, deviceToken);
      if (!result.ok) {
        throw new Error(result.reason || "Device update failed");
      }
      setMessage("Device updated. Login again.");
      setStep("success");
    } catch (e: any) {
      setMessage(e?.message || "Device update failed");
    } finally {
      setBusy(false);
    }
  };

  const labels = ["CODE", "FACE", "PRINT", "UPDATE", "DONE"];
  const idxByStep: Record<Step, number> = {
    code: 0,
    face: 1,
    fingerprint: 2,
    update: 3,
    success: 4,
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
            <StatusIndicator status="warning" label="Restricted Mode" />
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
            {step === "code" && (
              <div className="text-center">
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">ENTER TEMP CODE</h2>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-center font-mono tracking-widest text-lg mb-4"
                />
                {issuedCode && (
                  <p className="text-xs text-muted-foreground font-mono mb-3">Demo code: <span className="text-accent">{issuedCode}</span></p>
                )}
                <p className="text-xs text-muted-foreground font-mono mb-4">{message}</p>
                <Button variant="cyber-secondary" onClick={verifyCode} disabled={busy}>Verify Code</Button>
              </div>
            )}

            {step === "face" && (
              <div>
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">REGISTER FACE</h2>
                <FaceScanner mode="register" onSuccess={() => setStep("fingerprint")} />
              </div>
            )}

            {step === "fingerprint" && (
              <div>
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">REGISTER FINGERPRINT</h2>
                <FingerprintScanner mode="register" onSuccess={() => setStep("update")} />
              </div>
            )}

            {step === "update" && (
              <div className="text-center">
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">UPDATE DEVICE ID</h2>
                <p className="text-xs text-muted-foreground font-mono mb-6">Bind this phone to your account, then login again.</p>
                <Button variant="cyber" onClick={rebindDevice} disabled={busy}>Update Device ID</Button>
              </div>
            )}

            {step === "success" && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-accent" />
                </div>
                <h2 className="text-xl font-display tracking-wider text-accent mb-2">DEVICE UPDATED</h2>
                <p className="text-muted-foreground font-mono text-sm mb-6">{message}</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="cyber" onClick={() => navigate("/login")}>Login Again</Button>
                  <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate("/")}>Home</Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TempAccess;
