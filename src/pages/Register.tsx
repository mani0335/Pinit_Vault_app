import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, UserPlus, ChevronRight, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { FaceScanner } from "@/components/FaceScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";

type Step = "tempId" | "fingerprint" | "face" | "userId" | "complete";

function generateId(prefix: string) {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("tempId");
  const [tempId] = useState(() => generateId("TMP"));
  const [userId] = useState(() => generateId("USR"));
  const [copied, setCopied] = useState(false);
  const [webauthn, setWebauthn] = useState<any | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<string | null>(null);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps: Step[] = ["tempId", "fingerprint", "face", "userId", "complete"];
  const currentIdx = steps.indexOf(step);

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
              <UserPlus className="w-6 h-6 text-secondary" />
              <h1 className="text-2xl font-display font-bold tracking-wider text-foreground text-glow-purple">
                REGISTER
              </h1>
            </div>
            <StatusIndicator status="scanning" label="Identity Enrollment" />
          </div>

          {/* Steps */}
          <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
            {["ID", "PRINT", "FACE", "USER", "DONE"].map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono border ${
                  i === currentIdx ? "bg-secondary/20 border-secondary text-secondary" :
                  i < currentIdx ? "bg-neon-green/20 border-neon-green text-neon-green" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {i < currentIdx ? "✓" : label[0]}
                </div>
                {i < 4 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-surface rounded-xl p-8">
            {step === "tempId" && (
              <div className="text-center">
                <h2 className="text-lg font-display tracking-wider mb-6 text-foreground">TEMPORARY ID GENERATED</h2>
                <div className="bg-muted rounded-lg p-4 mb-6 border border-border">
                  <p className="text-xs text-muted-foreground font-mono mb-1">YOUR TEMP ID</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-display text-secondary font-bold tracking-widest">{tempId}</span>
                    <button onClick={() => copyId(tempId)} className="text-muted-foreground hover:text-foreground">
                      {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button variant="cyber-secondary" onClick={() => setStep("fingerprint")}>Continue to Biometric Enrollment</Button>
              </div>
            )}

            {step === "fingerprint" && (
              <div>
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">FINGERPRINT ENROLLMENT</h2>
                <FingerprintScanner mode="register" onSuccess={() => setStep("face")} onCredential={(c) => setWebauthn(c)} />
              </div>
            )}

            {step === "face" && (
              <div>
                <h2 className="text-lg font-display tracking-wider text-center mb-6 text-foreground">FACE CAPTURE</h2>
                <FaceScanner mode="register" onSuccess={(faceData?: string) => { setFaceEmbedding(faceData || null); setStep("userId"); }} />
              </div>
            )}

            {step === "userId" && (
              <div className="text-center">
                <h2 className="text-lg font-display tracking-wider mb-6 text-foreground">USER ID ASSIGNED</h2>
                <div className="bg-muted rounded-lg p-4 mb-4 border border-border">
                  <p className="text-xs text-muted-foreground font-mono mb-1">YOUR USER ID</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-display text-primary font-bold tracking-widest">{userId}</span>
                    <button onClick={() => copyId(userId)} className="text-muted-foreground hover:text-foreground">
                      {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-left bg-muted/50 rounded-lg p-3 mb-6 text-xs font-mono text-muted-foreground space-y-1">
                  <p>▸ Temp ID: <span className="text-secondary">{tempId}</span></p>
                  <p>▸ User ID: <span className="text-primary">{userId}</span></p>
                  <p>▸ Fingerprint: <span className="text-neon-green">ENROLLED</span></p>
                  <p>▸ Face Data: <span className="text-neon-green">CAPTURED</span></p>
                </div>
                <Button
                  variant="cyber"
                  onClick={async () => {
                    // store userId locally and register device with backend
                    try {
                      const { getDeviceToken } = await import('@/lib/deviceToken');
                      const deviceToken = await getDeviceToken();
                      localStorage.setItem('biovault_userId', userId);

                      // call backend register endpoint with webauthn and faceEmbedding if available
                      // debug: log values used for registration
                      // eslint-disable-next-line no-console
                      console.log('Register: userId, deviceToken', userId, deviceToken);
                      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                      const resp = await fetch(`${API_BASE}/api/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, deviceToken, webauthn, faceEmbedding }),
                      });
                      if (!resp.ok) {
                        console.warn('Register endpoint returned', resp.status);
                      }
                    } catch (e) {
                      console.warn('Failed to register with backend', e);
                    }
                    setStep('complete');
                  }}
                >Store & Verify</Button>
              </div>
            )}

            {step === "complete" && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-neon-green/10 border-2 border-neon-green flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <h2 className="text-xl font-display tracking-wider text-neon-green mb-2">REGISTRATION COMPLETE</h2>
                <p className="text-muted-foreground font-mono text-sm mb-6">Identity stored in secure vault</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="cyber" onClick={() => navigate("/login")}>Login Now</Button>
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

export default Register;
