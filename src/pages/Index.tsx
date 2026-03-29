import { useEffect } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { appStorage } from "@/lib/storage";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Always go to Login page - it will handle the routing logic internally
    const routeToLogin = async () => {
      try {
        // Wait for splash animation (1.8s)
        await new Promise(resolve => setTimeout(resolve, 1800));
        
        console.log('🚀 Index: Animation complete → Routing to Login page');
        // Always navigate to login - Login.tsx will check if user is registered
        // If registered: show fingerprint + face verification
        // If not registered: redirect to /biometric-options for registration or temp access
        navigate('/login');
      } catch (err) {
        console.error('❌ Index: Error during routing:', err);
        navigate('/login');
      }
    };
    
    routeToLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <HexGrid />
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9 }}
          className="text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex items-center justify-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-700 to-indigo-700 shadow-lg flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-4xl md:text-5xl font-display font-bold tracking-wider text-foreground text-glow-cyan"
            >
              BIOVAULT
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.4 }}
              className="text-sm text-muted-foreground font-mono tracking-widest uppercase"
            >
              Securing access with biometrics
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
