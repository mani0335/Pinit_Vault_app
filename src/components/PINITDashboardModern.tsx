import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ArrowLeft,
  Image,
  Database,
  Loader,
  Lock,
  Share2,
  Settings,
  LogOut,
  BarChart3,
  Zap,
  Shield,
  AlertCircle,
  TrendingUp,
  Home,
  Grid3x3,
  Clock,
  FileSearch,
  Activity,
  CheckCircle2,
  Sparkles,
  Eye,
  Download,
  Upload,
  Trash2,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { vaultAPI, certAPI } from "@/utils/apiClient";
import { appStorage } from "@/lib/storage";
import {
  embedUserIdInImage,
  extractUserIdFromImage,
  type WatermarkMetadata,
} from "@/lib/steganography";
import { Camera as CameraPlugin, CameraResultType, CameraSource } from "@capacitor/camera";
import { ImageAnalyzer } from "@/components/ImageAnalyzer";

interface PINITDashboardProps {
  userId?: string;
  isRestricted?: boolean;
}

// Animation variants (defined outside)
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

// HomePage component (moved outside)
interface HomePageProps {
  userId?: string;
  isRestricted?: boolean;
  vaultImages: any[];
  setActivePage: (page: "home" | "vault" | "analyzer" | "settings") => void;
}

function HomePage({ userId, isRestricted, vaultImages, setActivePage }: HomePageProps) {
  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
      {/* Hero Section */}
      <motion.div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 p-8 text-white shadow-2xl">
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white"
              />
              <span className="text-sm font-semibold uppercase tracking-wider text-cyan-100">Secure Vault</span>
            </div>
            <h1 className="text-4xl font-bold mb-3 leading-tight">
              Welcome Back
              <br />
              <span className="bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent">{userId ? userId.substring(0, 12) : "User"}</span>
            </h1>
            <p className="text-lg text-blue-100/80 max-w-lg">
              Your biometric vault is secure and ready. Manage your encrypted assets with confidence.
            </p>
          </motion.div>

          {isRestricted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 bg-orange-500/20 border border-orange-400/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-200">Temporary Access Active</p>
                <p className="text-xs text-orange-100/70 mt-1">Some features are limited until full authentication</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Image, label: "Assets", value: vaultImages.length, color: "from-blue-600 to-cyan-600" },
          { icon: Lock, label: "Encrypted", value: "100%", color: "from-green-600 to-emerald-600" },
          { icon: Shield, label: "Security", value: "Grade A", color: "from-purple-600 to-pink-600" },
          { icon: TrendingUp, label: "Activity", value: "Active", color: "from-orange-600 to-red-600" },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <motion.div
              whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg cursor-pointer overflow-hidden group relative`}
            >
              <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300" />
              <div className="relative z-10">
                <stat.icon className="w-6 h-6 mb-3 opacity-80" />
                <p className="text-xs opacity-80 mb-2">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 px-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Quick Actions
        </h2>

        <motion.div className="grid grid-cols-3 gap-3">
          {[
            { icon: Camera, label: "Encrypt Image", action: "analyzer" as const, color: "from-cyan-600 to-blue-600" },
            { icon: Image, label: "My Vault", action: "vault" as const, color: "from-purple-600 to-pink-600" },
            { icon: Settings, label: "Settings", action: "settings" as const, color: "from-slate-600 to-slate-700" },
          ].map((action, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActivePage(action.action)}
                className={`w-full bg-gradient-to-br ${action.color} rounded-2xl p-6 text-white shadow-lg transition-all duration-300 group relative overflow-hidden`}
              >
                <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <action.icon className="w-7 h-7" />
                  <span className="text-sm font-semibold">{action.label}</span>
                </div>
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Recent Activity */}
      {vaultImages.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 px-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Recent Assets
          </h2>

          <motion.div className="space-y-2">
            {vaultImages.slice(0, 3).map((image, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <motion.div whileHover={{ x: 4 }} className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Image className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate text-sm">{image.fileName}</p>
                      <p className="text-slate-400 text-xs">{image.fileSize} • {image.status}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

// VaultPage component (moved outside)
interface VaultPageProps {
  vaultImages: any[];
  loadingVault: boolean;
  setActivePage: (page: "home" | "vault" | "analyzer" | "settings") => void;
}

function VaultPage({ vaultImages, loadingVault, setActivePage }: VaultPageProps) {
  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => setActivePage("home")}
          className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-cyan-400" />
        </motion.button>
        <div>
          <h1 className="text-3xl font-bold text-white">My Vault</h1>
          <p className="text-slate-400 text-sm mt-1">{vaultImages.length} encrypted assets</p>
        </div>
      </div>

      {loadingVault ? (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="flex justify-center py-12">
          <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full" />
        </motion.div>
      ) : vaultImages.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <Image className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400 text-lg font-medium">No assets yet</p>
          <p className="text-slate-500 text-sm mt-2">Encrypt and store your first image</p>
        </motion.div>
      ) : (
         <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vaultImages.map((image, idx) => (
            <motion.div key={idx} variants={itemVariants} whileHover={{ y: -4 }} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors shadow-lg">
              {image.thumbnail && (
                <img src={image.thumbnail} alt={image.fileName} className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <p className="text-white font-semibold truncate">{image.fileName}</p>
                <p className="text-slate-400 text-xs mt-2">{image.fileSize}</p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400 text-xs">{image.status}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// AnalyzerPage component (moved outside)
interface AnalyzerPageProps {
  userId?: string;
  setActivePage: (page: "home" | "vault" | "analyzer" | "settings") => void;
}

function AnalyzerPage({ userId, setActivePage }: AnalyzerPageProps) {
  return (
    <ImageAnalyzer 
      userId={userId || "unknown"} 
      onBack={() => setActivePage("home")} 
    />
  );
}

// SettingsPage component (moved outside)
interface SettingsPageProps {
  userId?: string;
  isRestricted?: boolean;
  setActivePage: (page: "home" | "vault" | "analyzer" | "settings") => void;
  handleLogout: () => void;
}

function SettingsPage({ userId, isRestricted, setActivePage, handleLogout }: SettingsPageProps) {
  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <motion.button whileHover={{ x: -4 }} onClick={() => setActivePage("home")} className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors">
          <ArrowLeft className="w-6 h-6 text-cyan-400" />
        </motion.button>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
      </div>

      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-4">
        {/* User Info */}
        <motion.div variants={itemVariants} className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <p className="text-slate-400 text-sm mb-2">User ID</p>
          <p className="text-white font-mono font-bold text-lg break-all">{userId || "Unknown"}</p>
        </motion.div>

        {/* Security Status */}
        <motion.div variants={itemVariants} className="bg-gradient-to-br from-emerald-600/10 to-green-600/10 rounded-2xl p-6 border border-emerald-500/30 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-emerald-300 font-semibold">Security Status</p>
            <p className="text-emerald-200 text-sm">Your vault is secure</p>
          </div>
        </motion.div>

        {/* Access Type */}
        <motion.div variants={itemVariants} className={`rounded-2xl p-6 border flex items-center gap-4 ${
          isRestricted
            ? "bg-orange-600/10 border-orange-500/30"
            : "bg-cyan-600/10 border-cyan-500/30"
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            isRestricted
              ? "bg-orange-500/20"
              : "bg-cyan-500/20"
          }`}>
            <Lock className={isRestricted ? "w-6 h-6 text-orange-400" : "w-6 h-6 text-cyan-400"} />
          </div>
          <div className="flex-1">
            <p className={isRestricted ? "text-orange-300 font-semibold" : "text-cyan-300 font-semibold"}>
              {isRestricted ? "Temporary Access" : "Full Access"}
            </p>
            <p className={isRestricted ? "text-orange-200 text-sm" : "text-cyan-200 text-sm"}>
              {isRestricted ? "Limited features active" : "All features available"}
            </p>
          </div>
        </motion.div>

        {/* Logout */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export function PINITDashboard({ userId, isRestricted }: PINITDashboardProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<"home" | "vault" | "analyzer" | "settings">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verify authentication
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        console.log('🔐 [AUTH CHECK START] PINITDashboard Auth Verification');
        
        // TRY 1: Check appStorage (Capacitor Preferences - Android)
        let accessToken = null;
        let storedUserId = null;
        
        try {
          accessToken = await appStorage.getItem('biovault_token');
          storedUserId = await appStorage.getItem('biovault_userId');
          console.log('✅ Auth: Retrieved from appStorage (Capacitor)', { 
            hasToken: !!accessToken, 
            hasUserId: !!storedUserId
          });
        } catch (appStorageErr) {
          console.warn('⚠️ appStorage failed, trying localStorage:', appStorageErr);
          // TRY 2: Fallback to localStorage (Web/Backup)
          try {
            accessToken = localStorage.getItem('biovault_token');
            storedUserId = localStorage.getItem('biovault_userId');
            console.log('✅ Auth: Retrieved from localStorage (FALLBACK)', { 
              hasToken: !!accessToken, 
              hasUserId: !!storedUserId
            });
          } catch (localStorageErr) {
            console.error('❌ Both storage methods failed:', { appStorageErr, localStorageErr });
          }
        }

        console.log('🔐 PINITDashboard Auth Check:', { 
          hasToken: !!accessToken, 
          hasUserId: !!storedUserId,
          tokenLength: accessToken ? accessToken.length : 0,
          userIdValue: storedUserId
        });

        if (!accessToken || !storedUserId) {
          const reason = !accessToken ? 'No token found in storage' : 'No userId found in storage';
          console.log(`❌ PINITDashboard: ${reason} - redirecting to login`);
          setAuthError(reason);
          setIsCheckingAuth(false);
          setIsAuthenticated(false);
          // Give it a moment to display error before redirecting
          await new Promise(resolve => setTimeout(resolve, 1200));
          navigate('/login', { replace: true });
          return;
        }

        console.log('✅ PINITDashboard: Authentication verified - showing dashboard');
        setAuthError(null);
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('❌ Auth check failed:', errorMsg, err);
        setAuthError('Auth check failed: ' + errorMsg);
        setIsCheckingAuth(false);
        setIsAuthenticated(false);
        // Give it a moment to display error before redirecting
        await new Promise(resolve => setTimeout(resolve, 1200));
        navigate('/login', { replace: true });
      }
    };

    verifyAuth();
  }, [navigate]);

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center relative">
        {/* ON-SCREEN DEBUG PANEL */}
        <div className="fixed top-0 left-0 right-0 bg-slate-900/95 border-b border-cyan-500/30 p-4 text-xs font-mono text-cyan-300 max-h-32 overflow-auto z-50">
          <div className="max-w-4xl mx-auto space-y-1">
            <div>🔐 AUTH CHECK IN PROGRESS...</div>
            <div>📍 Checking appStorage (Capacitor Preferences)</div>
            <div>🔄 Will fallback to localStorage if needed</div>
            <div className="text-slate-400 mt-2">This should take 1-2 seconds...</div>
          </div>
        </div>

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full"></div>
          <p className="text-cyan-400/70 text-sm font-mono">Authenticating...</p>
          <p className="text-slate-500 text-xs">(Checking storage for token...)</p>
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
          <p className="text-sm text-cyan-400/70 font-mono max-w-xs">
            {authError || 'Unable to verify credentials. Redirecting to login...'}
          </p>
        </motion.div>
      </div>
    );
  }

  // Data states
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [cryptoFile, setCryptoFile] = useState<File | null>(null);
  const [cryptoPreview, setCryptoPreview] = useState<string>("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [encryptedResult, setEncryptedResult] = useState<any>(null);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPreview, setVerifyPreview] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [proofResult, setProofResult] = useState<WatermarkMetadata | null>(null);

  // Load vault images
  const loadVaultImages = useCallback(async () => {
    setLoadingVault(true);
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        currentUserId = await appStorage.getItem('biovault_userId');
      }

      if (!currentUserId) {
        console.warn('⚠️ No userId available for vault load');
        setLoadingVault(false);
        return; // Exit early if no userId
      }

      console.log('📦 Loading vault images for userId:', currentUserId);
      const res = await vaultAPI.list(currentUserId);
      const images = (res.assets || []).map((a: any) => ({
        ...a,
        id: a.asset_id || a.id,
        fileName: a.file_name || "Unknown",
        fileSize: a.file_size || "—",
        dateEncrypted: a.created_at,
        status: "Verified",
        thumbnail: a.thumbnail_url,
      }));

      setVaultImages(images);
      console.log('✅ Vault loaded:', images.length, 'images');
    } catch (err) {
      console.error("❌ Failed to load vault:", err);
      setVaultImages([]); // Set empty array on error
    } finally {
      setLoadingVault(false);
    }
  }, [userId]);

  useEffect(() => {
    loadVaultImages();
  }, [loadVaultImages]);

  // Image handlers
  const handleCameraCapture = async () => {
    try {
      setIsCameraOpen(true);
      const photo = await CameraPlugin.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      const base64 = photo.base64String || "";
      const preview = "data:image/jpeg;base64," + base64;

      setCryptoPreview(preview);
      setCryptoFile(new File([base64], "camera-image.jpg", { type: "image/jpeg" }));
      setIsCameraOpen(false);
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraOpen(false);
    }
  };

  const handleEncryptImage = async () => {
    if (!cryptoFile || !userId) return;

    setIsEncrypting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];

        try {
          const watermarked = await embedUserIdInImage(base64, userId);
          setEncryptedResult({ success: true, base64: watermarked });
          setCryptoFile(null);
          setCryptoPreview("");
        } catch (err) {
          console.error("Encryption failed:", err);
          setEncryptedResult({ success: false, error: String(err) });
        } finally {
          setIsEncrypting(false);
        }
      };

      reader.readAsDataURL(cryptoFile);
    } catch (err) {
      console.error("Image processing failed:", err);
      setIsEncrypting(false);
    }
  };

  const handleVerifyProof = async () => {
    if (!verifyFile) return;

    setIsVerifying(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];

        try {
          const metadata = await extractUserIdFromImage(base64);
          setProofResult(metadata);
        } catch (err) {
          console.error("Verification failed:", err);
          setProofResult(null);
        } finally {
          setIsVerifying(false);
        }
      };

      reader.readAsDataURL(verifyFile);
    } catch (err) {
      console.error("File read failed:", err);
      setIsVerifying(false);
    }
  };

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

  // ===================== RENDER =====================
  try {
    console.log('📊 Rendering PINITDashboard:', {
      isAuthenticated,
      activePage,
      loadingVault,
      vaultImagesCount: vaultImages.length,
      userIdProp: userId
    });

    if (!isAuthenticated) {
      console.warn('❌ NOT AUTHENTICATED - should not reach here');
      return null;
    }

    const pageToRender = activePage || 'home';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white overflow-hidden">
        {/* Main Content */}
        <div className="max-w-4xl mx-auto p-6 pb-24 pt-20">
          {/* Render pages */}
          {pageToRender === "home" && (
            <HomePage 
              userId={userId} 
              isRestricted={isRestricted} 
              vaultImages={vaultImages} 
              setActivePage={setActivePage} 
            />
          )}
          {pageToRender === "vault" && (
            <VaultPage 
              vaultImages={vaultImages} 
              loadingVault={loadingVault} 
              setActivePage={setActivePage} 
            />
          )}
          {pageToRender === "analyzer" && (
            <AnalyzerPage 
              userId={userId} 
              setActivePage={setActivePage} 
            />
          )}
          {pageToRender === "settings" && (
            <SettingsPage 
              userId={userId} 
              isRestricted={isRestricted} 
              setActivePage={setActivePage} 
              handleLogout={handleLogout} 
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <motion.div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-6 pb-6 px-6 border-t border-slate-800/50">
          <motion.div className="max-w-4xl mx-auto grid grid-cols-4 gap-2">
            {[
              { icon: Home, label: "Home", page: "home" },
              { icon: Image, label: "Vault", page: "vault" },
              { icon: FileSearch, label: "Analyzer", page: "analyzer" },
              { icon: Settings, label: "Settings", page: "settings" },
            ].map((item, idx) => (
              <motion.button
                key={idx}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActivePage(item.page as any)}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  activePage === item.page
                    ? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon className="w-6 h-6 mx-auto" />
                <p className="text-xs mt-1 font-medium">{item.label}</p>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  } catch (renderErr) {
    console.error('❌ PINITDashboard render error:', renderErr);
    return (
      <div className="w-full h-screen bg-black text-white p-4 flex flex-col items-center justify-center">
        <h2 className="text-lg font-bold text-red-400 mb-4">RENDER ERROR</h2>
        <pre className="bg-slate-900 p-4 rounded text-xs text-red-300 overflow-auto max-w-2xl max-h-64 font-mono">
          {renderErr instanceof Error ? renderErr.stack : String(renderErr)}
        </pre>
      </div>
    );
  }
}

export default PINITDashboard;
