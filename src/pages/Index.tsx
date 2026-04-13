import { useEffect } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HexGrid } from "@/components/HexGrid";
import { appStorage } from "@/lib/storage";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 🔐 THREE-TIER ROUTING: Check session → userId → register
    const route = async () => {
      try {
        // Wait for splash animation (1.8s)
        await new Promise(resolve => setTimeout(resolve, 1800));
        
        console.log('🔍 Index: Starting three-tier routing check...');
        
        const sessionToken = await appStorage.getItem('sessionToken');
        const expiryTime = await appStorage.getItem('sessionExpiryTime');
        const userId = await appStorage.getItem('biovault_userId');
        
        console.log('📊 Index: Route Decision Data:', {
          hasSessionToken: !!sessionToken,
          hasExpiry: !!expiryTime,
          hasUserId: !!userId,
          expiryStr: expiryTime
        });
        
        // ✅ TIER 1: Check if user has valid session (already logged in)
        if (sessionToken && expiryTime && userId) {
          const currentTime = Date.now();
          const tokenExpiry = parseInt(expiryTime);
          
          if (currentTime < tokenExpiry) {
            // VALID SESSION EXISTS - Go to dashboard
            console.log('✅ Index [TIER 1]: Valid session found → DASHBOARD');
            navigate('/dashboard', { replace: true });
            return;
          } else {
            // TOKEN EXPIRED - Try to refresh
            console.log('⏰ Index [TIER 1]: Token expired, attempting refresh...');
            const refreshToken = await appStorage.getItem('refreshToken');
            
            if (refreshToken) {
              try {
                const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/refresh-token`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken, userId })
                });
                
                if (response.ok) {
                  const data = await response.json();
                  await appStorage.setItem('sessionToken', data.token);
                  await appStorage.setItem('sessionExpiryTime', (Date.now() + 3600000).toString());
                  console.log('✅ Index [TIER 1]: Token refreshed → DASHBOARD');
                  navigate('/dashboard', { replace: true });
                  return;
                }
              } catch (refreshErr) {
                console.warn('⚠️ Index [TIER 1]: Refresh failed, will require re-login');
              }
            }
            // If no refresh token or refresh failed, fall through to TIER 2
          }
        }
        
        // ✅ TIER 2: Check if user is registered (userId exists) but no session
        if (userId && !sessionToken) {
          // User is registered but needs to login (session expired or new session)
          console.log('🔒 Index [TIER 2]: Registered user without session → LOGIN');
          navigate('/login', { replace: true });
          return;
        }
        
        // ✅ TIER 3: No userId = brand new user, try biometric login first
        console.log('📝 Index [TIER 3]: No userId found → LOGIN (prompt biometric first)');
        navigate('/login', { replace: true });
      } catch (err) {
        console.error('❌ Index: Error during routing:', err);
        // On error, go to login (safer default)
        navigate('/login', { replace: true });
      }
    };
    
    route();
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
              PINIT VAULT
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.4 }}
              className="text-sm text-muted-foreground font-mono tracking-widest uppercase"
            >
              Securing access with capture
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
