import { useNavigate } from "react-router-dom";
import { Shield, LogOut, ArrowLeft } from "lucide-react";
import { HexGrid } from "@/components/HexGrid";
import { Button } from "@/components/ui/button";
import PINITDashboard from "@/components/PINITDashboard";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("biovault_token");
    localStorage.removeItem("biovault_refresh_token");
    navigate("/login");
  };

  const handleBack = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <HexGrid />
      <div className="relative z-10 min-h-screen px-4 py-8">
        {/* Top Bar */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-display font-bold tracking-wider text-foreground text-glow-cyan">BIOVAULT</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Dashboard Content */}
        <div className="max-w-6xl mx-auto">
          <PINITDashboard userId={localStorage.getItem("biovault_userId") || undefined} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
