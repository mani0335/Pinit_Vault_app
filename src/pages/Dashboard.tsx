import { useNavigate, useLocation } from "react-router-dom";
import { Shield, LogOut, ArrowLeft, AlertCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { HexGrid } from "@/components/HexGrid";
import { Button } from "@/components/ui/button";
import PINITDashboard from "@/components/PINITDashboardModern";
import { useEffect, useState } from "react";
import { appStorage } from "@/lib/storage"; // ✅ IMPORTANT

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isTemporaryAccess, setIsTemporaryAccess] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  console.log('🚀 Dashboard component mounted');

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('📋 [Dashboard] Starting userId load...');
        const id = await appStorage.getItem("biovault_userId");
        console.log("✅ [Dashboard] USER ID FROM appStorage:", id);
        
        if (!id) {
          console.warn("⚠️ [Dashboard] No userId returned from appStorage, trying localStorage...");
          const localId = localStorage.getItem("biovault_userId");
          console.log("ℹ️ [Dashboard] localStorage userId:", localId);
          setUserId(localId || "unknown");
        } else {
          setUserId(id);
        }
      } catch (err) {
        console.error("❌ [Dashboard] Failed to load userId:", err);
        setDashboardError(String(err));
        setUserId("error");
      } finally {
        console.log('✅ [Dashboard] userId load complete');
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
          <p className="text-cyan-400/70 text-sm font-mono">Loading vault...</p>
          <p className="text-slate-500 text-xs">(Retrieving user data...)</p>
        </motion.div>
      </div>
    );
  }

  if (dashboardError) {
    console.error('⚠️ [Dashboard] Error loading:', dashboardError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Dashboard Error</h2>
          <p className="text-sm text-slate-400 mb-6">{dashboardError}</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white text-sm"
          >
            Back to Login
          </button>
        </div>
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

  const handleCompleteRegistration = () => {
    navigate("/register", { replace: true });
  };

  try {
    console.log('🎨 [Dashboard] Rendering main content with userId:', userId);
    return (
      <div className="min-h-screen relative overflow-hidden">
        <HexGrid />
        <div className="relative z-10 min-h-screen px-4 py-8">

          {/* Temporary Access Banner */}
          {isTemporaryAccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto mb-6 p-4 bg-amber-500/10 border-2 border-amber-500/50 rounded-xl"
            >
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-display font-bold text-amber-500 mb-2">⏱️ TEMPORARY ACCESS ACTIVE</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    You are currently in restricted mode with read-only access. Complete your full registration to unlock all features including upload, encryption, and export capabilities.
                  </p>
                  <Button 
                    onClick={handleCompleteRegistration}
                    className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-500 px-4 py-2 h-auto text-sm font-mono transition-all"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Complete Registration Now
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Top Bar */}
          <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="text-black hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-display font-bold tracking-wider text-foreground text-glow-cyan">
                PINIT VAULT
              </h1>
              {isTemporaryAccess && (
                <span className="ml-4 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full text-xs font-mono text-amber-500">
                  TEMPORARY ACCESS
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Dashboard Content - WRAPPED IN ERROR BOUNDARY */}
          <div className="max-w-6xl mx-auto">
            {console.log('📦 [Dashboard] About to render PINITDashboard...')}
            <PINITDashboard userId={userId || undefined} isRestricted={isRestricted} />
            {console.log('✅ [Dashboard] PINITDashboard rendered successfully')}
          </div>

        </div>
      </div>
    );
  } catch (err) {
    console.error('❌ [Dashboard] FATAL RENDER ERROR:', err);
    return (
      <div className="w-full h-screen bg-black text-white p-4 flex flex-col items-center justify-center">
        <h2 className="text-lg font-bold text-red-400 mb-4">DASHBOARD RENDER ERROR</h2>
        <div className="bg-slate-900 p-4 rounded text-xs text-red-300 font-mono max-w-2xl overflow-auto">
          <p className="mb-2"><strong>Error:</strong> {err instanceof Error ? err.message : String(err)}</p>
          <p><strong>Stack:</strong> {err instanceof Error ? err.stack : 'No stack trace'}</p>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="mt-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white"
        >
          Return to Login
        </button>
      </div>
    );
  }
};

export default Dashboard;