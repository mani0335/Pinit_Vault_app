import { motion } from "framer-motion";
import { ArrowLeft, Shield, LogIn, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/StatusIndicator";

const BiometricOptions = () => {
  const navigate = useNavigate();

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
                BIOMETRIC UNRECOGNIZED
              </h1>
            </div>
            <StatusIndicator status="warning" label="Access Options Available" />
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-surface rounded-2xl p-6 md:p-8 border border-primary/20"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-lg font-display tracking-wider text-foreground mb-2">NO MATCH FOUND</h2>
              <p className="text-muted-foreground font-mono text-sm mb-6">
                Your biometric data was not recognized in our system. Choose an option below to proceed.
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {/* Register Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="cyber"
                  className="w-full py-6 h-auto flex flex-col items-start justify-start text-left hover:bg-primary/20 transition-all duration-300"
                  onClick={() => navigate('/register')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm tracking-wide">NEW REGISTRATION</p>
                      <p className="text-xs text-muted-foreground font-mono"> Biometric enrollment</p>
                    </div>
                  </div>
                </Button>
              </motion.div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground font-mono">OR</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* Temp Access Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className="w-full py-6 h-auto flex flex-col items-start justify-start text-left border-neon-green/50 hover:bg-neon-green/10 hover:border-neon-green transition-all duration-300"
                  onClick={() => navigate('/temp-access-face')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-neon-green" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm tracking-wide text-neon-green">TEMPORARY ACCESS</p>
                      <p className="text-xs text-muted-foreground font-mono">Limited dashboard access with face verification</p>
                    </div>
                  </div>
                </Button>
              </motion.div>
            </div>

            {/* Info */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground font-mono text-center">
                Temporary access provides restricted functionality until you complete full registration.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default BiometricOptions;
