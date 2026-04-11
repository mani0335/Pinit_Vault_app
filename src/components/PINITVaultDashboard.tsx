import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Camera,
  Briefcase,
  Share2,
  User,
  LogOut,
  Bell,
  Settings,
  Upload,
  Plus,
  Download,
  Share,
  QrCode,
  TrendingUp,
  Eye,
  Lock,
  Clock,
  FileText,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appStorage } from "@/lib/storage";

interface PINITDashboardProps {
  userId?: string;
  isRestricted?: boolean;
}

type PageType = "home" | "vault" | "portfolio" | "share" | "identity";

export function PINITVaultDashboard({ userId, isRestricted }: PINITDashboardProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Verify authentication on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        let accessToken = null;
        let storedUserId = null;

        try {
          accessToken = await appStorage.getItem("biovault_token");
          storedUserId = await appStorage.getItem("biovault_userId");
        } catch {
          accessToken = localStorage.getItem("biovault_token");
          storedUserId = localStorage.getItem("biovault_userId");
        }

        if (!accessToken || !storedUserId) {
          setAuthError("No valid session");
          setIsCheckingAuth(false);
          setIsAuthenticated(false);
          await new Promise(resolve => setTimeout(resolve, 1200));
          navigate("/login", { replace: true });
          return;
        }

        setIsAuthenticated(true);
        setIsCheckingAuth(false);
      } catch (err) {
        setAuthError("Auth check failed");
        setIsCheckingAuth(false);
        setIsAuthenticated(false);
        await new Promise(resolve => setTimeout(resolve, 1200));
        navigate("/login", { replace: true });
      }
    };

    verifyAuth();
    // Only run on mount
  }, []);

  const handleLogout = async () => {
    await appStorage.removeItem("biovault_token");
    await appStorage.removeItem("biovault_refresh_token");
    await appStorage.removeItem("biovault_userId");
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
          <p className="text-cyan-400/70 text-sm font-mono">Authenticating...</p>
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
          <h2 className="text-xl font-display text-red-400">AUTHENTICATION FAILED</h2>
          <p className="text-sm text-cyan-400/70 font-mono">{authError}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white pb-24">
      {/* Content Area */}
      <AnimatePresence mode="wait">
        {currentPage === "home" && <HomePage key="home" />}
        {currentPage === "vault" && <VaultPage key="vault" />}
        {currentPage === "portfolio" && <PortfolioPage key="portfolio" />}
        {currentPage === "share" && <SharePage key="share" />}
        {currentPage === "identity" && <IdentityPage key="identity" userId={userId} onLogout={handleLogout} />}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-cyan-500/20 backdrop-blur-sm">
        <div className="flex justify-around items-center h-20 px-4">
          <NavButton
            icon={Home}
            label="Home"
            active={currentPage === "home"}
            onClick={() => setCurrentPage("home")}
          />
          <NavButton
            icon={Briefcase}
            label="Vault"
            active={currentPage === "vault"}
            onClick={() => setCurrentPage("vault")}
          />
          <NavButton
            icon={Plus}
            label="Create"
            active={currentPage === "portfolio"}
            onClick={() => setCurrentPage("portfolio")}
            highlight
          />
          <NavButton
            icon={Share2}
            label="Share"
            active={currentPage === "share"}
            onClick={() => setCurrentPage("share")}
          />
          <NavButton
            icon={User}
            label="Profile"
            active={currentPage === "identity"}
            onClick={() => setCurrentPage("identity")}
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
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
        highlight
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
          : active
            ? "text-cyan-400"
            : "text-slate-400 hover:text-cyan-300"
      }`}
    >
      <Icon size={24} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// ============= HOME PAGE =============
function HomePage() {
  const stats = [
    { label: "Docs Stored", value: "142", change: "+12 this month", icon: FileText },
    { label: "Active Shares", value: "8", change: "3 expire soon", icon: Share2 },
  ];

  const quickActions = [
    { icon: Upload, label: "Upload", color: "bg-blue-600" },
    { icon: Plus, label: "Create", color: "bg-slate-700" },
    { icon: Share, label: "Share", color: "bg-slate-700" },
    { icon: QrCode, label: "Scan QR", color: "bg-slate-700" },
  ];

  const recentActivity = [
    { icon: Eye, title: "TechCorp Resume View", desc: "Portfolio accessed", time: "Just now", status: "Success" },
    { icon: Share, title: "Passport Copy Shared", desc: "Sent to verify@bank.com", time: "2 hrs ago", status: "Active" },
    { icon: FileText, title: "Tax Form 2023.pdf", desc: "Uploaded to Vault", time: "Yesterday", status: "Encrypted" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-8 space-y-6"
    >
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome back,</h1>
        <p className="text-slate-400">Alex Morgan</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-4"
          >
            <p className="text-slate-400 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold mt-2">{stat.value}</p>
            <p className="text-cyan-400 text-xs mt-2">{stat.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Portfolio Views */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6"
      >
        <p className="text-slate-400 text-sm">Portfolio Views</p>
        <p className="text-3xl font-bold mt-2">1,204</p>
        <div className="mt-4 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg"></div>
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`${action.color} rounded-2xl p-4 flex flex-col items-center gap-2 transition-transform hover:scale-105`}
            >
              <action.icon size={24} />
              <span className="text-xs font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Storage Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Storage Overview</h2>
          <a href="#" className="text-blue-400 text-sm">Details</a>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#334155" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeDasharray={`${Math.PI * 100 * 0.45} ${Math.PI * 100}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-slate-400 text-sm">Used</p>
              <p className="text-2xl font-bold">45%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-slate-400 text-sm">IDs</p>
            <p className="text-xl font-bold">20%</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Certificates</p>
            <p className="text-xl font-bold">15%</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Medical</p>
            <p className="text-xl font-bold">10%</p>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Recent Activity</h2>
          <a href="#" className="text-blue-400 text-sm">See All</a>
        </div>

        {recentActivity.map((activity, idx) => (
          <div
            key={idx}
            className="bg-slate-800/50 border border-cyan-500/10 rounded-xl p-4 flex items-start gap-3"
          >
            <div className="bg-slate-700 rounded-full p-3 mt-1">
              <activity.icon size={20} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{activity.title}</p>
              <p className="text-slate-400 text-sm">{activity.desc}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs">{activity.time}</p>
              <p className="text-blue-400 text-xs font-medium">{activity.status}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ============= VAULT PAGE =============
function VaultPage() {
  const categories = ["All Files", "Personal", "Academic", "Project"];
  const files = [
    { name: "Passport_Copy.pdf", type: "PDF", size: "2.4 MB", date: "2 hrs ago", icon: FileText },
    { name: "Profile_Photo_HQ.jpg", type: "Image", size: "4.1 MB", date: "Yesterday", icon: Camera },
    { name: "Resume_2024_Final.docx", type: "Document", size: "1.2 MB", date: "Oct 12, 2023", icon: FileText },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-8 space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Vault</h1>
        <p className="text-slate-400">Securely manage your documents</p>
      </div>

      {/* Search */}
      <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <FileSearch size={20} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search files, folders..."
          className="bg-transparent outline-none flex-1 text-sm"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all ${
              idx === 0
                ? "bg-blue-600 text-white"
                : "bg-slate-800/50 border border-cyan-500/20 text-slate-400 hover:text-cyan-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {files.map((file, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-800/50 border border-cyan-500/10 rounded-xl p-4 flex items-center gap-4"
          >
            <div className="bg-slate-700 rounded-lg p-3">
              <file.icon size={24} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{file.name}</p>
              <p className="text-slate-400 text-sm">{file.size} • {file.date}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <Download size={18} />
              </button>
              <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Storage Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Vault Storage</h3>
          <Button className="bg-blue-600 hover:bg-blue-700 text-xs">Upgrade</Button>
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-[45%] bg-gradient-to-r from-blue-600 to-purple-600"></div>
          </div>
          <div className="flex justify-between text-sm text-slate-400">
            <p>4.5 GB Used</p>
            <p>5.5 GB Free</p>
          </div>
        </div>
      </motion.div>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-4 bg-blue-600 hover:bg-blue-700 rounded-full p-4 shadow-lg shadow-blue-500/50"
      >
        <Plus size={32} />
      </motion.button>
    </motion.div>
  );
}

// ============= PORTFOLIO PAGE =============
function PortfolioPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-8 space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create Portfolio</h1>
        <p className="text-slate-400">Curate documents for sharing</p>
      </div>

      {/* Portfolio Details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 space-y-4"
      >
        <h3 className="font-semibold text-lg">Portfolio Details</h3>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-sm">Portfolio Name</label>
            <input
              type="text"
              placeholder="e.g. Job Application 2024"
              className="w-full mt-2 bg-slate-700/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Description (Optional)</label>
            <textarea
              placeholder="Brief context for the recipient..."
              rows={3}
              className="w-full mt-2 bg-slate-700/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      </motion.div>

      {/* Select Documents */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Select Documents</h3>
          <button className="text-blue-400 text-sm">+ Add</button>
        </div>

        <div className="space-y-3">
          {[
            { name: "Resume_2024_Final.pdf", size: "1.2 MB" },
            { name: "Passport_Photo.jpg", size: "4.1 MB" },
          ].map((doc, idx) => (
            <div key={idx} className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-3">
              <div className="bg-slate-600 rounded p-2">
                <FileText size={20} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{doc.name}</p>
                <p className="text-slate-400 text-xs">{doc.size}</p>
              </div>
              <button className="text-red-400 hover:text-red-300">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <button className="w-full border-2 border-dashed border-cyan-500/50 rounded-lg py-6 text-center hover:border-cyan-400 transition-colors">
          <Plus className="mx-auto mb-2" size={24} />
          <p className="text-sm text-slate-400">Browse Vault</p>
        </button>
      </motion.div>

      {/* Visibility */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 space-y-3"
      >
        <h3 className="font-semibold">Visibility Summary</h3>
        
        <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-blue-400" />
            <span className="text-sm">Public Link</span>
          </div>
          <div className="w-10 h-6 bg-cyan-600 rounded-full relative">
            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-slate-400" />
            <span className="text-sm">Password Protect</span>
          </div>
          <div className="w-10 h-6 bg-slate-600 rounded-full relative">
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
          </div>
        </div>
      </motion.div>

      <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold text-base">
        Create Portfolio →
      </Button>
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
      className="px-4 pt-8 space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Secure Share</h1>
        <p className="text-slate-400">Configure access for selected items</p>
      </div>

      {/* Selected Item */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4 flex items-center gap-3"
      >
        <div className="bg-slate-700 rounded-lg p-3">
          <Briefcase size={24} className="text-blue-400" />
        </div>
        <div>
          <p className="font-semibold">Job Application 2024</p>
          <p className="text-slate-400 text-sm">Portfolio • 4 Documents</p>
        </div>
      </motion.div>

      {/* Share Method */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="font-semibold">Share Method</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-blue-600/20 border border-blue-500/50 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-blue-600/30 transition-colors">
            <Lock size={24} />
            <span className="text-sm font-medium">Secure Link</span>
          </button>
          <button className="bg-slate-700/50 border border-cyan-500/20 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-cyan-500/50 transition-colors">
            <QrCode size={24} />
            <span className="text-sm font-medium">QR Code</span>
          </button>
        </div>
      </motion.div>

      {/* Permissions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 space-y-4"
      >
        <h3 className="font-semibold">Permissions & Security</h3>

        {[
          { icon: Eye, title: "View Only", desc: "Recipient can view documents", enabled: true },
          { icon: Download, title: "Allow Download", desc: "Recipient can save files", enabled: false },
          { icon: Clock, title: "Link Expiry", desc: "Automatically revoke access", enabled: true },
          { icon: Lock, title: "Passcode Protection", desc: "Require PIN to open link", enabled: true },
        ].map((perm, idx) => (
          <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-700 last:border-0 last:pb-0">
            <perm.icon size={20} className={perm.enabled ? "text-blue-400" : "text-slate-600"} />
            <div className="flex-1">
              <p className="font-medium">{perm.title}</p>
              <p className="text-slate-400 text-xs">{perm.desc}</p>
            </div>
            <div
              className={`w-10 h-6 rounded-full relative transition-colors ${
                perm.enabled ? "bg-cyan-600" : "bg-slate-600"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  perm.enabled ? "right-1" : "left-1"
                }`}
              ></div>
            </div>
          </div>
        ))}
      </motion.div>

      <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold">
        <Lock size={18} className="mr-2" />
        Generate Secure Link
      </Button>
    </motion.div>
  );
}

// ============= IDENTITY PAGE =============
function IdentityPage({ userId, onLogout }: { userId?: string; onLogout: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-4 pt-8 space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Digital Identity</h1>
        <p className="text-slate-400">Manage your profile & security</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-cyan-500/20 rounded-2xl p-6 flex flex-col items-center gap-4"
      >
        <div className="w-24 h-24 rounded-full border-4 border-blue-500 bg-slate-700 flex items-center justify-center">
          <User size={48} className="text-blue-400" />
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">Alex Thompson</p>
          <p className="text-cyan-400 text-sm font-mono mt-1">ALX-8924-THM</p>
        </div>
        <div className="bg-green-500/20 border border-green-500 rounded-full px-3 py-1">
          <p className="text-green-400 text-xs font-medium">✓ Verified</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Member Since</p>
          <p className="text-lg font-bold mt-2">Mar 2023</p>
        </div>
        <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Trust Score</p>
          <p className="text-lg font-bold mt-2">98/100</p>
        </div>
      </div>

      {/* Personal Details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Personal Details</h3>
          <button className="text-blue-400 text-sm">Edit</button>
        </div>

        {[
          { label: "Email Address", value: "alex.thompson@example.com" },
          { label: "Phone Number", value: "+1 (555) 123-4567" },
          { label: "Primary Address", value: "123 Secure Lane, NY 10001" },
        ].map((detail, idx) => (
          <div key={idx} className="pb-3 border-b border-slate-700 last:border-0 last:pb-0">
            <p className="text-slate-400 text-xs">{detail.label}</p>
            <p className="font-medium mt-1">{detail.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Security & Access */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 space-y-4"
      >
        <h3 className="font-semibold">Security & Access</h3>

        {[
          { icon: Camera, title: "Biometric Login", desc: "Use Face ID or Touch ID", status: "Enabled" },
          { icon: Shield, title: "2-Step Verification", desc: "Authenticator App", status: "Enabled", badge: true },
          { icon: Lock, title: "App PIN Code", desc: "Last changed 3 months ago", status: "Change" },
        ].map((sec, idx) => (
          <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-700 last:border-0 last:pb-0">
            <sec.icon size={20} className="text-blue-400 mt-1" />
            <div className="flex-1">
              <p className="font-medium">{sec.title}</p>
              <p className="text-slate-400 text-xs">{sec.desc}</p>
            </div>
            {sec.badge && <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">Enabled</div>}
            {!sec.badge && <button className="text-blue-400 text-sm font-medium">{sec.status}</button>}
          </div>
        ))}
      </motion.div>

      {/* Connected Platforms */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 space-y-3"
      >
        <h3 className="font-semibold">Connected Platforms</h3>

        {[
          { name: "Google Drive", synced: "2 hours ago" },
          { name: "LinkedIn", synced: "Portfolio connected" },
        ].map((platform, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">{platform.name}</p>
              <p className="text-slate-400 text-xs">{platform.synced}</p>
            </div>
            <button className="text-red-400 text-sm font-medium">Disconnect</button>
          </div>
        ))}

        <button className="w-full text-center py-3 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium hover:border-cyan-500/50 transition-colors">
          + Connect New Platform
        </button>
      </motion.div>

      {/* Logout */}
      <Button
        onClick={onLogout}
        className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 h-12 font-semibold text-red-400"
      >
        <LogOut size={18} className="mr-2" />
        Secure Logout
      </Button>
    </motion.div>
  );
}
