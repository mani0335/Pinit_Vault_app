import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Briefcase,
  Share2,
  User,
  LogOut,
  Plus,
  Download,
  Share,
  QrCode,
  Eye,
  Lock,
  Clock,
  FileText,
  Trash2,
  AlertCircle,
  Shield,
  Search,
  Settings,
  Search as FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appStorage } from "@/lib/storage";

interface PINITDashboardProps {
  userId?: string;
  isRestricted?: boolean;
}

type PageType = "home" | "vault" | "portfolio" | "share" | "identity";

export function PINITVaultDashboard({ userId: propsUserId, isRestricted }: PINITDashboardProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [userId, setUserId] = useState<string | null>(null);

  // Verify authentication and load user data on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        let accessToken = null;
        let storedUserId = null;

        try {
          accessToken = await appStorage.getItem("biovault_token");
          storedUserId = await appStorage.getItem("biovault_userId");
        } catch (e) {
          console.error("appStorage error:", e);
          accessToken = localStorage.getItem("biovault_token");
          storedUserId = localStorage.getItem("biovault_userId");
        }

        if (!accessToken || !storedUserId) {
          throw new Error("No valid session");
        }

        setUserId(storedUserId);
        // Extract name from userId or use it as display name
        const displayName = storedUserId.split("@")[0] || "User";
        setUserName(displayName.charAt(0).toUpperCase() + displayName.slice(1));
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Auth error:", err);
        setAuthError("Session expired. Please login again.");
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifyAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await appStorage.removeItem("biovault_token");
      await appStorage.removeItem("biovault_refresh_token");
      await appStorage.removeItem("biovault_userId");
    } catch (e) {
      console.error("Error clearing appStorage:", e);
    }
    localStorage.removeItem("biovault_token");
    localStorage.removeItem("biovault_refresh_token");
    localStorage.removeItem("biovault_userId");
    navigate("/login", { replace: true });
  };

  if (isCheckingAuth) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full"></div>
          <p className="text-cyan-400/70 text-sm font-mono">Loading vault...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center px-4"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-red-400">Auth Failed</h2>
          <p className="text-sm text-red-300">{authError}</p>
          <Button onClick={() => navigate("/login")} className="mt-4">
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white pb-24">
      {/* Top Bar with User Profile */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-gradient-to-r from-slate-950/95 via-purple-950/95 to-slate-950/95 backdrop-blur-xl border-b border-purple-500/30 px-4 py-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/50">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{userName}</p>
              <p className="text-xs text-purple-300">{userId?.substring(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-all hover:shadow-lg hover:shadow-red-500/50"
          >
            <LogOut size={20} className="text-red-400" />
          </button>
        </div>
      </motion.div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {currentPage === "home" && <HomePage key="home" userName={userName} />}
        {currentPage === "vault" && <VaultPage key="vault" />}
        {currentPage === "portfolio" && <PortfolioPage key="portfolio" />}
        {currentPage === "share" && <SharePage key="share" />}
        {currentPage === "identity" && <IdentityPage key="identity" userName={userName} userId={userId} />}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-xl border-t border-purple-500/30">
        <div className="flex justify-around items-center h-20 px-2">
          <NavButton
            icon={Home}
            label="Home"
            active={currentPage === "home"}
            onClick={() => {
              try {
                setCurrentPage("home");
              } catch (e) {
                console.error("Error navigating to home:", e);
              }
            }}
          />
          <NavButton
            icon={Briefcase}
            label="Vault"
            active={currentPage === "vault"}
            onClick={() => {
              try {
                setCurrentPage("vault");
              } catch (e) {
                console.error("Error navigating to vault:", e);
              }
            }}
          />
          <NavButton
            icon={Plus}
            label="Create"
            active={currentPage === "portfolio"}
            onClick={() => {
              try {
                setCurrentPage("portfolio");
              } catch (e) {
                console.error("Error navigating to portfolio:", e);
              }
            }}
            highlight
          />
          <NavButton
            icon={Share2}
            label="Share"
            active={currentPage === "share"}
            onClick={() => {
              try {
                setCurrentPage("share");
              } catch (e) {
                console.error("Error navigating to share:", e);
              }
            }}
          />
          <NavButton
            icon={User}
            label="Profile"
            active={currentPage === "identity"}
            onClick={() => {
              try {
                setCurrentPage("identity");
              } catch (e) {
                console.error("Error navigating to identity:", e);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  highlight = false,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
        highlight
          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50 border border-purple-400/50"
          : active
            ? "text-purple-300 border-b-2 border-purple-500"
            : "text-slate-400 hover:text-purple-300 hover:bg-purple-900/20"
      }`}
    >
      <Icon size={22} />
      <span className="text-xs font-semibold">{label}</span>
    </motion.button>
  );
}

// ============= HOME PAGE =============
function HomePage({ userName }: { userName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-5"
    >
      {/* Hero Banner with Modern Gradient */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 p-6 text-white shadow-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-pink-500 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-blue-500 blur-3xl"></div>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">PINIT Vault</h2>
          <p className="text-purple-100 text-sm">Your secure digital sanctuary</p>
        </div>
      </motion.div>

      {/* Stats Grid - Modern Cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Documents", value: "12", icon: FileText, gradient: "from-blue-600 to-purple-600" },
          { label: "Active Shares", value: "3", icon: Share2, gradient: "from-purple-600 to-pink-600" },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold">{stat.label}</p>
                <p className="text-3xl font-bold mt-2 text-white">{stat.value}</p>
              </div>
              <stat.icon size={28} className="text-white/70" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions - Modern Buttons */}
      <div>
        <h3 className="text-lg font-bold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Plus, label: "Upload", gradient: "from-blue-600 to-cyan-600" },
            { icon: Share, label: "Share", gradient: "from-purple-600 to-pink-600" },
          ].map((action, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`bg-gradient-to-br ${action.gradient} rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transition-all`}
            >
              <action.icon size={24} />
              <span className="text-sm font-bold">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Activity - Modern Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-slate-800/50 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-5 shadow-xl"
      >
        <h3 className="font-semibold mb-4 text-white">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl">
            <span className="text-sm font-medium">Vault accessed</span>
            <span className="text-purple-300 text-xs font-bold">Just now</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============= VAULT PAGE =============
function VaultPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const files = [
    { name: "Document_1.pdf", size: "2.4 MB", date: "Today" },
    { name: "Image_backup.jpg", size: "4.1 MB", date: "Yesterday" },
    { name: "Passport_Copy.pdf", size: "1.2 MB", date: "2 days ago" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Vault</h1>

      {/* Search Bar - Modern */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
        <FileSearch size={20} className="text-purple-400" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent outline-none flex-1 text-sm placeholder-slate-500"
        />
      </div>

      {/* Files List - Modern Cards */}
      <div className="space-y-3">
        {files.map((file, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-gradient-to-r from-slate-800/40 to-purple-900/20 border border-purple-500/20 backdrop-blur-xl rounded-xl p-4 flex items-center justify-between hover:border-purple-500/50 transition-all shadow-lg hover:shadow-xl hover:shadow-purple-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-2 shadow-lg">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{file.name}</p>
                <p className="text-purple-300/70 text-xs">{file.size} • {file.date}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-purple-600/30 rounded-lg transition-all"
            >
              <Download size={18} className="text-purple-400" />
            </motion.button>
          </motion.div>
        ))}
      </div>

      {files.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No documents found</p>
        </div>
      )}
    </motion.div>
  );
}

// ============= PORTFOLIO PAGE =============
function PortfolioPage() {
  const [portfolioName, setPortfolioName] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Create Portfolio</h1>

      <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
        <div>
          <label className="text-purple-300 text-sm font-semibold">Portfolio Name</label>
          <input
            type="text"
            placeholder="e.g., Job Application"
            value={portfolioName}
            onChange={(e) => setPortfolioName(e.target.value)}
            className="w-full mt-3 bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
          />
        </div>

        <div>
          <label className="text-purple-300 text-sm font-semibold">Description</label>
          <textarea
            placeholder="Add details..."
            rows={3}
            className="w-full mt-3 bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all resize-none"
          />
        </div>

        <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all">
          Create Portfolio
        </Button>
      </div>
    </motion.div>
  );
}

// ============= SHARE PAGE =============
function SharePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Secure Share</h1>

      <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
        <p className="text-purple-300/80 text-sm">Configure sharing permissions and security</p>

        <div className="space-y-3">
          {[
            { icon: Eye, title: "View Only", enabled: true },
            { icon: Download, title: "Allow Download", enabled: false },
            { icon: Lock, title: "Password Protection", enabled: true },
          ].map((perm, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${perm.enabled ? "bg-purple-600/30" : "bg-slate-700/30"}`}>
                  <perm.icon size={18} className={perm.enabled ? "text-purple-400" : "text-slate-500"} />
                </div>
                <span className="text-sm font-semibold">{perm.title}</span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-all ${perm.enabled ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/50" : "bg-slate-600"}`}></div>
            </div>
          ))}
        </div>

        <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all">
          Generate Link
        </Button>
      </div>
    </motion.div>
  );
}

// ============= IDENTITY PAGE =============
function IdentityPage({ userName, userId }: { userName: string; userId: string | null }) {
  const [email, setEmail] = useState("user@example.com");
  const [phone, setPhone] = useState("+1 (555) 000-0000");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-6 space-y-4 pb-8"
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Digital Identity</h1>

      {/* Profile Card - Modern */}
      <motion.div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-purple-500/50">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{userName}</p>
          <p className="text-purple-300/70 text-xs font-mono mt-2">{userId?.substring(0, 12)}...</p>
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-full px-4 py-2 mt-3 inline-block">
            <p className="text-green-400 text-xs font-bold">✓ VERIFIED</p>
          </div>
        </div>
      </motion.div>

      {/* Personal Details */}
      <motion.div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-white">Personal Details</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-purple-400 text-sm font-semibold hover:text-purple-300 transition-colors"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
        </div>

        {[
          { label: "Email", value: email, setter: setEmail },
          { label: "Phone", value: phone, setter: setPhone },
        ].map((field, idx) => (
          <div key={idx} className="pb-4 border-b border-purple-500/20 last:border-0">
            <p className="text-purple-300/70 text-xs font-semibold">{field.label}</p>
            {isEditing ? (
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                className="w-full mt-2 bg-slate-700/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500/70 transition-all text-white"
              />
            ) : (
              <p className="font-semibold mt-2 text-white">{field.value}</p>
            )}
          </div>
        ))}
      </motion.div>

      {/* Security Settings */}
      <motion.div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-3 shadow-xl">
        <h3 className="font-bold text-lg text-white mb-4">Security Settings</h3>
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/30 p-2 rounded-lg">
              <Shield size={18} className="text-purple-400" />
            </div>
            <span className="text-sm font-semibold">Biometric Login</span>
          </div>
          <div className="w-10 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg shadow-purple-500/50"></div>
        </div>
      </motion.div>
    </motion.div>
  );
}
