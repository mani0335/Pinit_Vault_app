import { useNavigate, useLocation } from "react-router-dom";
import { Shield, LogOut, ArrowLeft, AlertCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { HexGrid } from "@/components/HexGrid";
import { Button } from "@/components/ui/button";
import PINITDashboard from "@/components/PINITDashboard";
import { useEffect, useState } from "react";
import { appStorage } from "@/lib/storage"; // ✅ IMPORTANT

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [isTemporaryAccess, setIsTemporaryAccess] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const id = await appStorage.getItem("biovault_userId");
      console.log("USER ID FROM appStorage:", id); // ✅ DEBUG
      setUserId(id);
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

  const handleLogout = () => {
    localStorage.removeItem("biovault_token");
    localStorage.removeItem("biovault_refresh_token");
    navigate("/login");
  };

  const handleBack = () => {
    navigate("/login");
  };

  const handleCompleteRegistration = () => {
    navigate("/register", { replace: true });
  };

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

        {/* Dashboard Content */}
        <div className="max-w-6xl mx-auto">
          <PINITDashboard userId={userId || undefined} isRestricted={isRestricted} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;