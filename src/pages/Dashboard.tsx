import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Wallet, ImageIcon, Shield, LogOut, Lock, AlertTriangle, FileText } from "lucide-react";
import { HexGrid } from "@/components/HexGrid";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";
import PINITDashboard from "@/components/PINITDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTemp = searchParams.get("mode") === "temp";
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showPINIT, setShowPINIT] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("biovault_token");
    localStorage.removeItem("biovault_refresh_token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <HexGrid />
      <div className="relative z-10 min-h-screen px-4 py-8">
        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-display font-bold tracking-wider text-foreground text-glow-cyan">BIOVAULT</h1>
          </div>
          <div className="flex items-center gap-4">
            {isTemp && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30">
                <AlertTriangle className="w-3 h-3 text-accent" />
                <span className="text-xs font-mono text-accent">RESTRICTED</span>
              </div>
            )}
            <StatusIndicator status={isTemp ? "warning" : "online"} label={isTemp ? "Temp Session" : "Authenticated"} />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Dashboard Content */}
        <div className="max-w-6xl mx-auto">
          {/* Welcome */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
            <h2 className="text-2xl font-display tracking-wider text-foreground mb-1">
              {isTemp ? "TEMP SESSION" : "WELCOME BACK"}
            </h2>
            <p className="text-muted-foreground font-mono text-sm">
              {isTemp ? "Limited access mode • Security changes disabled" : "USR-92837465 • Full access granted"}
            </p>
          </motion.div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <CyberCard glowColor="cyan" onClick={() => !showPINIT && setActiveModule("profile")} className="h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-foreground mb-1">USER PROFILE</h3>
                    <p className="text-xs text-muted-foreground font-mono">View identity & biometric status</p>
                  </div>
                </div>
              </CyberCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <CyberCard glowColor="lime" onClick={() => setShowPINIT(!showPINIT)} className="h-full cursor-pointer hover:border-neon-green/50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-neon-green/10 flex items-center justify-center border border-neon-green/30 shrink-0">
                    <FileText className="w-6 h-6 text-neon-green" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-foreground mb-1">DIGITAL VAULT</h3>
                    <p className="text-xs text-muted-foreground font-mono">My vault, portfolios & access</p>
                  </div>
                </div>
              </CyberCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <CyberCard glowColor="purple" onClick={() => !showPINIT && setActiveModule("wallet")} className="h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/30 shrink-0">
                    <Wallet className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-foreground mb-1">WALLET</h3>
                    <p className="text-xs text-muted-foreground font-mono">Secure digital assets</p>
                  </div>
                </div>
              </CyberCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <CyberCard glowColor="pink" onClick={() => !showPINIT && setActiveModule("encryption")} className="h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/30 shrink-0">
                    <ImageIcon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-foreground mb-1">IMAGE ENCRYPTION</h3>
                    <p className="text-xs text-muted-foreground font-mono">Encrypt & decrypt files</p>
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          </div>

          {/* PINIT Dashboard View */}
          {showPINIT && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-2xl tracking-wider text-foreground mb-1">STUDENT DIGITAL VAULT</h3>
                  <p className="text-sm font-mono text-muted-foreground">Capture → Secure → Organize → Build → Share → Track → Control</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowPINIT(false)} className="text-muted-foreground">✕ Exit</Button>
              </div>
              <div className="glass-surface rounded-xl p-8">
                <PINITDashboard userId={localStorage.getItem("biovault_userId") || undefined} />
              </div>
            </motion.div>
          )}

          {/* Active Module Panel */}
          {activeModule && (
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-surface rounded-xl p-8"
            >
              {activeModule === "profile" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-lg tracking-wider text-foreground">USER PROFILE</h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveModule(null)} className="text-muted-foreground">✕</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "User ID", value: "USR-92837465", color: "text-primary" },
                      { label: "Temp ID", value: "TMP-874521", color: "text-secondary" },
                      { label: "Fingerprint", value: "ENROLLED", color: "text-neon-green" },
                      { label: "Face Data", value: "CAPTURED", color: "text-neon-green" },
                      { label: "Status", value: isTemp ? "RESTRICTED" : "ACTIVE", color: isTemp ? "text-accent" : "text-neon-green" },
                      { label: "Last Login", value: new Date().toLocaleString(), color: "text-muted-foreground" },
                    ].map((item) => (
                      <div key={item.label} className="bg-muted/50 rounded-lg p-3 border border-border">
                        <p className="text-xs text-muted-foreground font-mono mb-1">{item.label}</p>
                        <p className={`font-mono text-sm ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {isTemp && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <Lock className="w-4 h-4 text-accent" />
                      <span className="text-xs font-mono text-accent">Security & auth settings are disabled in temp mode</span>
                    </div>
                  )}
                </div>
              )}

              {activeModule === "wallet" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-lg tracking-wider text-foreground">SECURE WALLET</h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveModule(null)} className="text-muted-foreground">✕</Button>
                  </div>
                  <div className="text-center py-8">
                    <div className="w-24 h-24 rounded-2xl bg-secondary/10 border border-secondary/30 flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-12 h-12 text-secondary" />
                    </div>
                    <p className="text-3xl font-display font-bold text-foreground mb-1">$12,847.00</p>
                    <p className="text-sm font-mono text-muted-foreground mb-6">Available Balance</p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="cyber-secondary">Send</Button>
                      <Button variant="cyber">Receive</Button>
                    </div>
                  </div>
                </div>
              )}

              {activeModule === "encryption" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-lg tracking-wider text-foreground">IMAGE ENCRYPTION</h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveModule(null)} className="text-muted-foreground">✕</Button>
                  </div>
                  <div className="text-center py-8">
                    <div className="w-24 h-24 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="w-12 h-12 text-accent" />
                    </div>
                    <p className="text-foreground font-display tracking-wider mb-2">AES-256 ENCRYPTION</p>
                    <p className="text-sm font-mono text-muted-foreground mb-6">Drop an image to encrypt or decrypt</p>
                    <div className="border-2 border-dashed border-border rounded-xl p-12 mb-4 hover:border-accent/50 transition-colors cursor-pointer">
                      <p className="text-muted-foreground font-mono text-sm">Drop image here or click to browse</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button variant="cyber-accent">Encrypt</Button>
                      <Button variant="cyber">Decrypt</Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
