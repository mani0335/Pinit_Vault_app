import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, UserPlus, ChevronRight, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { FingerprintScanner } from "@/components/FingerprintScanner";
import { FaceScanner } from "@/components/FaceScanner";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";
import { registerUser } from "@/lib/authService";
import { appStorage } from "@/lib/storage";

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
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-4 md:py-8">
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

          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-surface rounded-2xl p-6 md:p-8 border border-primary/20">
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
                <Button
                  variant="cyber-secondary"
                  size="sm"
                  className="w-full max-w-[280px] text-xs tracking-wide"
                  onClick={async () => {
                    // Store userId using Capacitor Preferences (proper mobile storage)
                    try {
                      console.log('💾 STEP 0: Saving userId to Capacitor storage:', userId);
                      await appStorage.setItem('biovault_userId', userId);
                      console.log('✅ STEP 0: userId saved successfully');
                      setStep("fingerprint");
                    } catch (err) {
                      console.error('❌ Failed to save userId:', err);
                      setRegisterError('Failed to save user ID');
                    }
                  }}
                >
                  Continue Enrollment
                </Button>
              </div>
            )}

            {step === "fingerprint" && (
              <div>
                <FingerprintScanner mode="register" required={true} onSuccess={() => setStep("face")} onCredential={(c) => setWebauthn(c)} />
              </div>
            )}

            {step === "face" && (
              <div>
                <FaceScanner mode="register" onSuccess={(faceData?: number[]) => { setFaceEmbedding(faceData || null); setStep("userId"); }} />
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
                  disabled={isRegistering}
                  onClick={async () => {
                    setIsRegistering(true);
                    setRegisterError(null);
                    try {
                      const { getDeviceToken } = await import('@/lib/deviceToken');
                      const deviceToken = await getDeviceToken();
                      
                      console.log('📝 STEP 1: Saving userId to storage:', userId);
                      // CRITICAL: Save userId FIRST using dual storage
                      await appStorage.setItem('biovault_userId', userId);
                      
                      // Verify it was saved
                      const verifyUserId = await appStorage.getItem('biovault_userId');
                      console.log('✅ STEP 2: Verified userId saved:', verifyUserId);
                      if (verifyUserId !== userId) {
                        throw new Error('Failed to save userId to storage - verification failed');
                      }
                      
                      // Store face embedding if available
                      if (faceEmbedding && faceEmbedding.length) {
                        await appStorage.setItem('biovault_faceEmbedding', JSON.stringify(faceEmbedding));
                        console.log('✅ Face embedding saved');
                      }
                      
                      console.log('📝 STEP 3: Registering user with backend:', { userId, deviceToken, hasFaceEmbedding: !!faceEmbedding });
                      
                      // Call backend to create user account - CRITICAL STEP
                      const data = await registerUser({ userId, deviceToken, webauthn, faceEmbedding });
                      console.log('✅ STEP 4: User registration successful with backend:', data);
                      
                      if (!data || !data.ok) {
                        throw new Error('Backend registration returned invalid response');
                      }
                      
                      // Verify user was actually created on backend
                      console.log('📝 STEP 5: Verifying user was created on backend...');
                      const { checkUserRegistered } = await import('@/lib/authService');
                      const checkResult = await checkUserRegistered(userId);
                      console.log('✅ STEP 6: User verified on backend:', checkResult);
                      
                      if (!checkResult.ok) {
                        throw new Error('User registration verification failed: ' + (checkResult.reason || 'Unknown error'));
                      }
                      
                      if (data?.tempCode) {
                        setRecoveryCode(String(data.tempCode));
                      }
                      
                      console.log('✅ STEP 7: Registration complete - user ready for login');
                      setStep('complete');
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : 'Registration failed';
                      console.error('❌ Registration error:', msg);
                      setRegisterError('Registration Error: ' + msg);
                      setIsRegistering(false);
                    }
                  }}
                >{isRegistering ? 'Saving...' : 'Store & Verify'}</Button>
                {registerError && (
                  <p className="mt-3 text-xs font-mono text-destructive text-center">{registerError}</p>
                )}
              </div>
            )}

            {step === "complete" && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-neon-green/10 border-2 border-neon-green flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <h2 className="text-xl font-display tracking-wider text-neon-green mb-2">REGISTRATION COMPLETE</h2>
                <p className="text-muted-foreground font-mono text-sm mb-6">Identity stored. Please login to continue.</p>
                {recoveryCode && (
                  <div className="bg-muted rounded-lg p-3 border border-border mb-6">
                    <p className="text-xs text-muted-foreground font-mono mb-1">TEMP ACCESS CODE</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-display text-accent text-xl tracking-widest">{recoveryCode}</span>
                      <button onClick={() => copyId(recoveryCode)} className="text-muted-foreground hover:text-foreground">
                        {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  <Button variant="cyber" onClick={async () => {
                    // CRITICAL: Ensure userId is persisted before navigating
                    const savedId = await appStorage.getItem('biovault_userId');
                    console.log('🔐 About to login - stored userId:', savedId);
                    
                    if (!savedId) {
                      console.error('❌ ERROR: userId not in storage!');
                      setRegisterError('User ID not saved. Please try again.');
                      return;
                    }
                    
                    // userId is confirmed saved - navigate immediately
                    console.log('✅ userId confirmed in storage - navigating to login');
                    navigate("/login");
                  }}>Login Now</Button>
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
