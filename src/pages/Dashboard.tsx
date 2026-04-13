import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { appStorage } from "@/lib/storage";
import PINITDashboard from "@/components/PINITDashboardNew";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isTemporaryAccess, setIsTemporaryAccess] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  console.log('🚀 [Dashboard] Component mounted');

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('📋 [Dashboard] Loading userId from storage...');
        const id = await appStorage.getItem("biovault_userId");
        console.log("✅ [Dashboard] userId loaded:", id);
        setUserId(id);
      } catch (err) {
        console.error("❌ [Dashboard] Failed to load userId:", err);
        // Fall back to localStorage
        const localId = localStorage.getItem("biovault_userId");
        console.log("📍 [Dashboard] Fallback to localStorage:", localId);
        setUserId(localId);
      } finally {
        setIsLoadingUser(false);
      }
    };
    loadUser();

    // Check if user has temporary access
    const tempAccess = (location.state as any)?.tempAccess || false;
    const restricted = (location.state as any)?.restricted || false;
    
    if (tempAccess || restricted) {
      console.log('⏱️ Dashboard: Temporary access detected');
      setIsTemporaryAccess(true);
      setIsRestricted(true);
    }
  }, [location.state]);

  // Show loading state while userId is loading
  if (isLoadingUser) {
    console.log('📊 [Dashboard] Showing loading screen...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full"></div>
          <p className="text-cyan-400/70 text-sm font-mono">🔄 Loading vault...</p>
          <p className="text-slate-500 text-xs">(Retrieving your vault...)</p>
        </motion.div>
      </div>
    );
  }

  const handleLogout = () => {
    // 🔐 Clear from BOTH storage systems (mobile + web)
    localStorage.removeItem("biovault_token");
    localStorage.removeItem("biovault_refresh_token");
    localStorage.removeItem("biovault_userId");
    
    // CRITICAL: Also clear from appStorage (Capacitor Preferences for Android)
    appStorage.removeItem("biovault_token");
    appStorage.removeItem("biovault_refresh_token");
    appStorage.removeItem("biovault_userId");
    
    console.log('🚪 Dashboard: Logout complete - all storage cleared');
    navigate("/login");
  };

  const handleBack = () => {
    navigate("/login");
  };

  // SAFETY CHECK: If we somehow got here without a userId, redirect back to login, NOT register
  if (!userId && !isLoadingUser) {
    console.error('❌ [Dashboard] CRITICAL: No userId found - redirecting to login');
    console.log('📍 This prevents infinite register loop');
    // Don't redirect again if already in a navigation state
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-red-500/30 border-t-red-500 rounded-full"></div>
          <p className="text-red-400/70 text-sm font-mono">⚠️ Session expired, redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  const handleCompleteRegistration = () => {
    navigate("/register", { replace: true });
  };

  console.log('🎨 [Dashboard] Rendering with userId:', userId);
  
  return <PINITDashboard userId={userId || undefined} />;
};

export default Dashboard;