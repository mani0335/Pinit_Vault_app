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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white pb-24">
      {/* Top Bar with User Profile */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/20 px-4 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-xs text-cyan-400">{userId?.substring(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
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
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-cyan-500/20 backdrop-blur-sm">
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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
        highlight
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
          : active
            ? "text-cyan-400"
            : "text-slate-400 hover:text-cyan-300"
      }`}
    >
      <Icon size={22} />
      <span className="text-xs font-medium">{label}</span>
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
      className="px-4 pt-8 space-y-6"
    >
      {/* Hero Banner */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 p-6 text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">PINIT Vault</h2>
          <p className="text-sm text-cyan-100">Secure document management</p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Documents", value: "12", icon: FileText },
          { label: "Shares", value: "3", icon: Share2 },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4"
          >
            <p className="text-slate-400 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Plus, label: "Upload", color: "bg-blue-600" },
            { icon: Share, label: "Share", color: "bg-cyan-600" },
          ].map((action, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`${action.color} rounded-xl p-4 flex flex-col items-center gap-2`}
            >
              <action.icon size={24} />
              <span className="text-xs font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4"
      >
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm p-2 bg-slate-700/30 rounded-lg">
            <span>Vault accessed</span>
            <span className="text-cyan-400 text-xs">Just now</span>
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
      className="px-4 pt-8 space-y-4"
    >
      <h1 className="text-2xl font-bold">Vault</h1>

      {/* Search Bar */}
      <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 flex items-center gap-3">
        <FileSearch size={20} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent outline-none flex-1 text-sm"
        />
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {files.map((file, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-slate-800/50 border border-cyan-500/10 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-700 rounded p-2">
                <FileText size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{file.name}</p>
                <p className="text-slate-400 text-xs">{file.size} • {file.date}</p>
              </div>
            </div>
            <button className="p-2 hover:bg-slate-700 rounded transition-colors">
              <Download size={18} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Empty state message if needed */}
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
      className="px-4 pt-8 space-y-4"
    >
      <h1 className="text-2xl font-bold">Create Portfolio</h1>

      <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-6 space-y-4">
        <div>
          <label className="text-slate-400 text-sm">Portfolio Name</label>
          <input
            type="text"
            placeholder="e.g., Job Application"
            value={portfolioName}
            onChange={(e) => setPortfolioName(e.target.value)}
            className="w-full mt-2 bg-slate-700/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white outline-none focus:border-cyan-500/50"
          />
        </div>

        <div>
          <label className="text-slate-400 text-sm">Description</label>
          <textarea
            placeholder="Add details..."
            rows={3}
            className="w-full mt-2 bg-slate-700/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white outline-none focus:border-cyan-500/50"
          />
        </div>

        <Button className="w-full bg-blue-600 hover:bg-blue-700">Create Portfolio</Button>
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
      className="px-4 pt-8 space-y-4"
    >
      <h1 className="text-2xl font-bold">Secure Share</h1>

      <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-6 space-y-4">
        <p className="text-slate-400 text-sm">Select documents and configure sharing settings</p>

        <div className="space-y-3">
          {[
            { icon: Eye, title: "View Only", enabled: true },
            { icon: Download, title: "Allow Download", enabled: false },
            { icon: Lock, title: "Password Protection", enabled: true },
          ].map((perm, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <perm.icon size={18} className={perm.enabled ? "text-cyan-400" : "text-slate-600"} />
                <span className="text-sm">{perm.title}</span>
              </div>
              <div className={`w-8 h-5 rounded-full transition-colors ${perm.enabled ? "bg-cyan-600" : "bg-slate-600"}`}></div>
            </div>
          ))}
        </div>

        <Button className="w-full bg-blue-600 hover:bg-blue-700">Generate Link</Button>
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
      className="px-4 pt-8 space-y-4 pb-8"
    >
      <h1 className="text-2xl font-bold">Digital Identity</h1>

      {/* Profile Card */}
      <motion.div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-cyan-500/30 rounded-xl p-6 flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{userName}</p>
          <p className="text-cyan-400 text-xs font-mono mt-1">{userId?.substring(0, 12)}...</p>
          <div className="bg-green-500/20 border border-green-500 rounded-full px-3 py-1 mt-2 inline-block">
            <p className="text-green-400 text-xs font-medium">✓ Verified</p>
          </div>
        </div>
      </motion.div>

      {/* Personal Details */}
      <motion.div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Personal Details</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
        </div>

        {[
          { label: "Email", value: email, setter: setEmail },
          { label: "Phone", value: phone, setter: setPhone },
        ].map((field, idx) => (
          <div key={idx} className="pb-3 border-b border-slate-700 last:border-0">
            <p className="text-slate-400 text-xs">{field.label}</p>
            {isEditing ? (
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                className="w-full mt-1 bg-slate-700/50 border border-cyan-500/20 rounded px-2 py-1 text-sm outline-none"
              />
            ) : (
              <p className="font-medium mt-1">{field.value}</p>
            )}
          </div>
        ))}
      </motion.div>

      {/* Security Settings */}
      <motion.div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold mb-3">Security Settings</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-cyan-400" />
              <span className="text-sm">Biometric Login</span>
            </div>
            <div className="w-8 h-5 bg-cyan-600 rounded-full"></div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
