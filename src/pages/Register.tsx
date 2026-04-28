import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, UserPlus, ChevronRight, Copy, Check, XCircle } from "lucide-react";
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
  const [userIdSaved, setUserIdSaved] = useState(false);

  // CRITICAL: Save userId to persistent storage immediately when component loads
  useEffect(() => {
    const saveUserIdImmediately = async () => {
      try {
        console.log('🚀 Register: Saving userId to storage immediately:', userId);
        await appStorage.setItem('biovault_userId', userId);
        console.log('✅ Register: userId saved successfully to storage');
        setUserIdSaved(true);
      } catch (err) {
        console.error('❌ Register: Failed to save userId:', err);
        // Try again
        setTimeout(() => saveUserIdImmediately(), 300);
      }
    };

    saveUserIdImmediately();
  }, [userId]);

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

          {registerError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {registerError}
            </motion.div>
          )}

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
                <FingerprintScanner 
                  mode="register" 
                  required={true} 
                  userId={userId} 
                  onSuccess={(credential) => {
                    console.log('Fingerprint scan completed successfully');
                    // CRITICAL: Clear any error messages immediately
                    setRegisterError(null);
                    
                    // GUARD: Only proceed if fingerprint credential was actually captured
                    if (!credential) {
                      console.warn('Missing webauthn credential! Preventing advance to face.');
                      setRegisterError('Fingerprint capture failed. Please try again.');
                      return;
                    }
                    // Additional validation: ensure credential has biometric data
                    if (!credential.id || !credential.verified) {
                      console.warn('Invalid biometric credential! Preventing advance to face.');
                      setRegisterError('Invalid biometric data. Please scan your fingerprint properly.');
                      return;
                    }
                    console.log('Fingerprint captured and validated. Advancing to face scan.');
                    setRegisterError(null); // Double-clear error
                    setStep("face");
                  }} 
                  onCredential={(c) => {
                    console.log('Register: Received fingerprint credential:', c?.id?.substring(0, 30));
                    console.log('Register: Credential verification status:', c?.verified);
                    setWebauthn(c);
                    setRegisterError(null); // Clear any previous errors immediately
                  }} 
                  onError={(error) => {
                    console.error('Register: Fingerprint scan error:', error);
                    if (error && error.trim() !== '') {
                      setRegisterError(error);
                    } else {
                      setRegisterError(null);
                    }
                  }}
                />
              </div>
            )}

            {step === "face" && (
              <div>
                {!webauthn && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                    ❌ Fingerprint not captured. Please go back and register your fingerprint first.
                  </div>
                )}
                <FaceScanner 
                  mode="register" 
                  onSuccess={(faceData?: any) => { 
                    console.log('📸 Register: FaceScanner returned:', faceData);
                    console.log('📋 faceData type:', typeof faceData);
                    console.log('📋 faceData.embedding:', faceData?.embedding);
                    
                    // Extract embedding from wrapped object
                    const embedding = faceData?.embedding || faceData || null;
                    
                    // ✅ GUARD: Only proceed if face embedding was actually captured
                    if (!embedding || (Array.isArray(embedding) && embedding.length === 0)) {
                      console.warn('⚠️ Missing face embedding! Preventing advance to userId.');
                      setRegisterError('Face capture failed. Please try again.');
                      return;
                    }
                    
                    console.log('🎯 Register: Extracted embedding:', {
                      exists: !!embedding,
                      isArray: Array.isArray(embedding),
                      length: embedding?.length || 0,
                      first5: embedding ? embedding.slice(0, 5) : 'N/A',
                      sum: embedding ? embedding.reduce((a, b) => a + Math.abs(b), 0) : 'N/A'
                    });
                    
                    setFaceEmbedding(embedding); 
                    setRegisterError(null); // Clear any previous errors
                    
                    console.log('✅ Register: Face captured. Setting step to userId');
                    setStep("userId"); 
                  }} 
                />
              </div>
            )}

            {step === "userId" && (
              <div className="text-center">
                <h2 className="text-lg font-display tracking-wider mb-6 text-foreground">UNIQUE ID CREATED</h2>
                <div className="bg-muted rounded-lg p-4 mb-4 border border-border">
                  <p className="text-xs text-muted-foreground font-mono mb-1">YOUR UNIQUE ID</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-display text-primary font-bold tracking-widest">{userId}</span>
                    <button onClick={() => copyId(userId)} className="text-muted-foreground hover:text-foreground">
                      {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-left bg-muted/50 rounded-lg p-3 mb-6 text-xs font-mono text-muted-foreground space-y-1">
                  <p>▸ Temp ID: <span className="text-secondary">{tempId}</span></p>
                  <p>▸ PINIT ID: <span className="text-primary">{userId}</span></p>
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
                      // ✅ CRITICAL VALIDATION: Ensure both biometrics are captured
                      if (!webauthn || !webauthn.id) {
                        throw new Error('Fingerprint not captured. Please go back and register your fingerprint.');
                      }
                      
                      if (!faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
                        throw new Error('Face data not captured. Please go back and scan your face.');
                      }
                      
                      console.log(' Pre-register validation passed:');
                      console.log('   - Fingerprint: ');
                      console.log('   - Face embedding: ');
                      
                      // FAST PARALLEL OPERATIONS - Execute multiple operations simultaneously
                      console.log(' FAST MODE: Starting parallel operations...');
                      
                      // Parallel execution of device token and storage operations
                      const [deviceToken] = await Promise.all([
                        (async () => {
                          const { getDeviceToken } = await import('@/lib/deviceToken');
                          return await getDeviceToken();
                        })()
                      ]);
                      
                      // Parallel storage operations - much faster
                      const storagePromises = [
                        appStorage.setItem('biovault_userId', userId),
                        faceEmbedding && faceEmbedding.length 
                          ? appStorage.setItem('biovault_faceEmbedding', JSON.stringify(faceEmbedding))
                          : Promise.resolve()
                      ];
                      
                      // Execute all storage operations in parallel
                      await Promise.all(storagePromises);
                      console.log(' FAST: All storage operations completed in parallel');
                      
                      // Quick verification (optional - can be skipped for speed)
                      const verifyUserId = await appStorage.getItem('biovault_userId');
                      if (verifyUserId !== userId) {
                        throw new Error('Failed to save userId to storage');
                      }
                      
                      console.log(' FAST: Storage verified, proceeding to backend...');
                      
                      // Optimized backend call with fast timeout
                      const data = await registerUser({ userId, deviceToken, webauthn, faceEmbedding });
                      console.log(' FAST: Backend registration completed:', data);
                      
                      if (!data || !data.ok) {
                        throw new Error('Backend registration returned invalid response');
                      }
                      
                      // Skip token saving for speed - tokens are generated during login, not registration
                      console.log(' FAST: Registration complete - no tokens to save');
                      
                      // Skip verification for speed - backend already confirmed success
                      console.log(' FAST: Registration complete - skipping verification for speed');
                      
                      if (data?.tempCode) {
                        setRecoveryCode(String(data.tempCode));
                      }
                      
                      console.log(' FAST MODE: Registration completed successfully!');
                      setStep('complete');
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : 'Registration failed';
                      console.error(' Registration error:', msg);
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
                <div className="flex gap-3 justify-center">
                  <Button variant="cyber" onClick={async () => {
                    console.log('🔐 Login Now clicked');
                    
                    // CRITICAL: Verify userId is in storage before navigating
                    let savedId = null;
                    for (let attempt = 1; attempt <= 5; attempt++) {
                      savedId = await appStorage.getItem('biovault_userId');
                      console.log(`🔍 Register: Storage check attempt ${attempt}:`, savedId);
                      
                      if (savedId) {
                        console.log('✅ Register: userId confirmed in storage!');
                        break;
                      }
                      
                      if (attempt < 5) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                      }
                    }
                    
                    if (!savedId) {
                      console.error('❌ Register: userId MISSING from storage! Using fallback:', userId);
                      // Save again as fallback
                      await appStorage.setItem('biovault_userId', userId);
                      savedId = userId;
                    }
                    
                    // Navigate to login with userId in state as backup
                    console.log('🚀 Register: Navigating to login with userId:', savedId);
                    navigate("/login", { state: { userId: savedId } });
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
