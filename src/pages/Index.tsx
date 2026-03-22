import { useEffect } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { appStorage } from "@/lib/storage";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is registered FIRST, then route accordingly
    const checkAndRoute = async () => {
      try {
        // Check if userId exists in device storage
        const userId = await appStorage.getItem("biovault_userId");
        console.log('🔍 Index: Checking registration status...', { userId });
        
        // Wait for splash animation (1.8s)
        await new Promise(resolve => setTimeout(resolve, 1800));
        
        if (userId) {
          // User is registered - go to LOGIN
          console.log('✅ User registered (userId:', userId, ') → Going to Login');
          navigate('/login');
        } else {
          // User is NOT registered - go to REGISTER
          console.log('❌ No userId found → Going to Register');
          navigate('/register');
        }
      } catch (err) {
        console.error('❌ Index: Error checking registration:', err);
        // On error, default to register (safer)
        navigate('/register');
      }
    };
    
    checkAndRoute();
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
